//! Recognises uploaded files by their content. The name and MIME type a client
//! sends are free text, so neither decides what a file is or how it is stored.

use crate::common::cloudinary::ResourceType;
use std::io::{Cursor, Read};
use zip::ZipArchive;

const MIB: usize = 1024 * 1024;
/// Images are compressed in the browser before they are sent.
pub const MAX_IMAGE_BYTES: usize = 2 * MIB;
pub const MAX_DOCUMENT_BYTES: usize = 5 * MIB;
/// The preview office applications store inside a document is a small JPEG or
/// PNG; reading is capped so a crafted archive cannot inflate it.
const MAX_THUMBNAIL_BYTES: u64 = 512 * 1024;
const OFFICE_THUMBNAILS: [&str; 3] = [
    "docProps/thumbnail.jpeg",
    "docProps/thumbnail.jpg",
    "docProps/thumbnail.png",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageFormat {
    Jpeg,
    Png,
    Webp,
    Gif,
    Heic,
    Avif,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OfficeFormat {
    Docx,
    Pptx,
    Xlsx,
}

impl OfficeFormat {
    pub const fn extension(self) -> &'static str {
        match self {
            Self::Docx => "docx",
            Self::Pptx => "pptx",
            Self::Xlsx => "xlsx",
        }
    }

    /// The part every document of this kind has; its presence tells the three
    /// formats apart, as they share the same ZIP container.
    const fn main_part(self) -> &'static str {
        match self {
            Self::Docx => "word/document.xml",
            Self::Pptx => "ppt/presentation.xml",
            Self::Xlsx => "xl/workbook.xml",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileKind {
    Image(ImageFormat),
    Pdf,
    Office(OfficeFormat),
}

impl FileKind {
    /// Cloudinary renders images and PDFs itself (previews, page thumbnails);
    /// office documents are stored as they are.
    pub const fn resource_type(self) -> ResourceType {
        match self {
            Self::Image(_) | Self::Pdf => ResourceType::Image,
            Self::Office(_) => ResourceType::Raw,
        }
    }

    pub const fn format(self) -> &'static str {
        match self {
            Self::Image(ImageFormat::Jpeg) => "jpg",
            Self::Image(ImageFormat::Png) => "png",
            Self::Image(ImageFormat::Webp) => "webp",
            Self::Image(ImageFormat::Gif) => "gif",
            Self::Image(ImageFormat::Heic) => "heic",
            Self::Image(ImageFormat::Avif) => "avif",
            Self::Pdf => "pdf",
            Self::Office(office) => office.extension(),
        }
    }

    pub const fn max_bytes(self) -> usize {
        match self {
            Self::Image(_) => MAX_IMAGE_BYTES,
            Self::Pdf | Self::Office(_) => MAX_DOCUMENT_BYTES,
        }
    }
}

/// A verified office document with the preview image it carries, if any.
#[derive(Debug)]
pub struct OfficeDocument {
    pub format: OfficeFormat,
    pub thumbnail: Option<Vec<u8>>,
}

/// Images and PDFs by their signature bytes. ZIP containers need
/// [`inspect_office`], which reads the archive.
pub fn sniff(bytes: &[u8]) -> Option<FileKind> {
    let starts = |magic: &[u8]| bytes.starts_with(magic);

    if starts(b"\xFF\xD8\xFF") {
        return Some(FileKind::Image(ImageFormat::Jpeg));
    }
    if starts(b"\x89PNG\r\n\x1A\n") {
        return Some(FileKind::Image(ImageFormat::Png));
    }
    if starts(b"GIF87a") || starts(b"GIF89a") {
        return Some(FileKind::Image(ImageFormat::Gif));
    }
    if starts(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        return Some(FileKind::Image(ImageFormat::Webp));
    }
    if starts(b"%PDF-") {
        return Some(FileKind::Pdf);
    }
    // ISO base media files name their brand right after the `ftyp` box type.
    if bytes.get(4..8) == Some(b"ftyp") {
        return match bytes.get(8..12)? {
            b"heic" | b"heix" | b"heim" | b"heis" | b"mif1" | b"msf1" => {
                Some(FileKind::Image(ImageFormat::Heic))
            }
            b"avif" | b"avis" => Some(FileKind::Image(ImageFormat::Avif)),
            _ => None,
        };
    }
    None
}

pub fn is_zip(bytes: &[u8]) -> bool {
    bytes.starts_with(b"PK\x03\x04")
}

/// Reads the archive's directory to confirm a Word, PowerPoint or Excel
/// document. Macro-enabled documents are refused: members would open them
/// from a task they did not write. Only the preview image is decompressed.
/// Parsing is CPU-bound, so callers run this off the async executor.
pub fn inspect_office(bytes: &[u8]) -> Option<OfficeDocument> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).ok()?;

    let has = |archive: &ZipArchive<_>, name: &str| archive.index_for_name(name).is_some();
    if !has(&archive, "[Content_Types].xml") {
        return None;
    }
    if archive
        .file_names()
        .any(|name| name.ends_with("vbaProject.bin"))
    {
        return None;
    }

    let format = [OfficeFormat::Docx, OfficeFormat::Pptx, OfficeFormat::Xlsx]
        .into_iter()
        .find(|format| has(&archive, format.main_part()))?;

    let thumbnail = OFFICE_THUMBNAILS
        .iter()
        .find_map(|name| read_capped(&mut archive, name))
        .filter(|image| {
            matches!(
                sniff(image),
                Some(FileKind::Image(ImageFormat::Jpeg | ImageFormat::Png))
            )
        });

    Some(OfficeDocument { format, thumbnail })
}

fn read_capped(archive: &mut ZipArchive<Cursor<&[u8]>>, name: &str) -> Option<Vec<u8>> {
    let entry = archive.by_name(name).ok()?;
    let mut content = Vec::new();
    entry
        .take(MAX_THUMBNAIL_BYTES + 1)
        .read_to_end(&mut content)
        .ok()?;

    (content.len() as u64 <= MAX_THUMBNAIL_BYTES).then_some(content)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use zip::{ZipWriter, write::SimpleFileOptions};

    fn archive(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, content) in entries {
            writer
                .start_file(*name, SimpleFileOptions::default())
                .unwrap();
            writer.write_all(content).unwrap();
        }
        writer.finish().unwrap().into_inner()
    }

    const JPEG: &[u8] = b"\xFF\xD8\xFF\xE0rest";

    #[test]
    fn recognises_images_and_pdfs_by_signature() {
        assert_eq!(sniff(JPEG), Some(FileKind::Image(ImageFormat::Jpeg)));
        assert_eq!(
            sniff(b"\x89PNG\r\n\x1A\nrest"),
            Some(FileKind::Image(ImageFormat::Png))
        );
        assert_eq!(sniff(b"GIF89a.."), Some(FileKind::Image(ImageFormat::Gif)));
        assert_eq!(
            sniff(b"RIFF\0\0\0\0WEBPVP8 "),
            Some(FileKind::Image(ImageFormat::Webp))
        );
        assert_eq!(
            sniff(b"\0\0\0\x18ftypheic\0\0\0\0"),
            Some(FileKind::Image(ImageFormat::Heic))
        );
        assert_eq!(
            sniff(b"\0\0\0\x18ftypavif\0\0\0\0"),
            Some(FileKind::Image(ImageFormat::Avif))
        );
        assert_eq!(sniff(b"%PDF-1.7\n"), Some(FileKind::Pdf));
    }

    #[test]
    fn rejects_everything_else() {
        for bytes in [
            &b""[..],
            b"<svg xmlns=\"http://www.w3.org/2000/svg\">",
            b"<!doctype html><script>",
            b"MZ\x90\0",
            b"\0\0\0\x18ftypisom\0\0\0\0",
            b"RIFF\0\0\0\0AVI ",
        ] {
            assert_eq!(sniff(bytes), None, "accepted {bytes:?}");
        }
    }

    #[test]
    fn tells_office_formats_apart_and_extracts_their_preview() {
        let docx = archive(&[
            ("[Content_Types].xml", b"<Types/>"),
            ("word/document.xml", b"<w:document/>"),
            ("docProps/thumbnail.jpeg", JPEG),
        ]);
        let document = inspect_office(&docx).unwrap();
        assert_eq!(document.format, OfficeFormat::Docx);
        assert_eq!(document.thumbnail.as_deref(), Some(JPEG));

        let xlsx = archive(&[
            ("[Content_Types].xml", b"<Types/>"),
            ("xl/workbook.xml", b"<workbook/>"),
        ]);
        let document = inspect_office(&xlsx).unwrap();
        assert_eq!(document.format, OfficeFormat::Xlsx);
        assert!(document.thumbnail.is_none());
    }

    #[test]
    fn refuses_macros_and_other_archives() {
        let macro_enabled = archive(&[
            ("[Content_Types].xml", b"<Types/>"),
            ("word/document.xml", b"<w:document/>"),
            ("word/vbaProject.bin", b"\0"),
        ]);
        assert!(inspect_office(&macro_enabled).is_none());

        let plain_zip = archive(&[("readme.txt", b"hi")]);
        assert!(inspect_office(&plain_zip).is_none());

        assert!(inspect_office(b"PK\x03\x04 truncated").is_none());
    }

    #[test]
    fn ignores_previews_that_are_not_images() {
        let docx = archive(&[
            ("[Content_Types].xml", b"<Types/>"),
            ("word/document.xml", b"<w:document/>"),
            ("docProps/thumbnail.jpeg", b"<svg/>"),
        ]);
        assert!(inspect_office(&docx).unwrap().thumbnail.is_none());
    }
}
