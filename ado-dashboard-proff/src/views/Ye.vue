<template>
  <div class="suround">
    <!-- Login Screen -->
    <div v-if="!isAuthenticated" class="login-wrapper">
      <div class="card p-6 login-card glass">
        <div class="login-header">
          <div class="avatar">
            <span>YE</span>
          </div>
          <h2 class="text-2xl font-bold">Passwort erforderlich</h2>
          <p class="text-muted small">Nur für eingeladene Augen. Gib das Zugangspasswort ein.</p>
        </div>

        <div class="login-body">
          <label class="small text-muted">Passwort</label>
          <input
              type="password"
              v-model="loginPassword"
              @keyup.enter="login"
              placeholder="Passwort eingeben"
              class="input enhanced"
              autocomplete="current-password"
          />
          <button @click="login" class="btn primary w-full login-button">Weiter</button>
          <p v-if="loginError" class="error-text">{{ loginError }}</p>
        </div>

        <div class="login-foot small text-muted">
          <span>Gesichert • Kanye Info</span>
        </div>
      </div>
    </div>

    <!-- Protected Content -->
    <div
        v-else
        class="kanye-page full"
        :style="{ '--bg-image': `url(${heroImageUrl})` }"
    >
      <!-- Navigation -->
      <nav class="kanye-nav-fixed card nav-elevate">
        <div class="container row items-center justify-between nav-content">
          <div class="brand row items-center gap-4">
            <div class="brand-mark">YE</div>
            <div class="brand-text">
              <h2 class="text-xl font-bold">Kanye West</h2>
              <p class="small interr text-muted">Biografie • Diskografie • Galerie</p>
            </div>
          </div>

          <button
              class="mobile-menu-toggle"
              @click="mobileMenuOpen = !mobileMenuOpen"
              :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
              aria-label="Menü umschalten"
          >
            <span class="bar" :class="{ open: mobileMenuOpen }"></span>
            <span class="bar" :class="{ open: mobileMenuOpen }"></span>
            <span class="bar" :class="{ open: mobileMenuOpen }"></span>
          </button>

          <div :class="['nav-links row gap-4', { open: mobileMenuOpen }]">
            <button
                @click="() => { scrollTo('biography'); mobileMenuOpen = false }"
                class="btn ghost nav-link"
            >
              Biografie
            </button>
            <button
                @click="() => { scrollTo('discography'); mobileMenuOpen = false }"
                class="btn ghost nav-link"
            >
              Diskografie
            </button>
            <button
                @click="() => { scrollTo('controversies'); mobileMenuOpen = false }"
                class="btn ghost nav-link"
            >
              Kontroversen
            </button>
            <button
                @click="() => { scrollTo('gallery'); mobileMenuOpen = false }"
                class="btn ghost nav-link"
            >
              Galerie
            </button>
          </div>
        </div>
      </nav>

      <!-- Hero -->
      <header class="kanye-hero full-c flex items-center justify-center text-center">
        <div class="kanye-hero-content">
          <h1 class="title-xl font-extrabold mb-4 animate-fade-in-up">
            KANYE WEST
          </h1>
          <p class="subtitle text-muted animate-fade-in-up delay-200">
            Visionär. Musiker. Einflussnehmer.
          </p>
          <div class="hero-actions animate-fade-in-up delay-400">
            <button
                @click="scrollTo('biography')"
                class="btn primary"
            >
              Mehr erfahren
            </button>
            <button
                @click="scrollTo('discography')"
                class="btn ghost"
            >
              Direkt zur Diskografie
            </button>
          </div>
        </div>
        <div class="hero-overlay"></div>
      </header>

      <!-- Content -->
      <main class="full-c bg-bg">
        <div class="container py-12">
          <!-- Biografie -->
          <section id="biography" class="row gap-8 mb-12 section-block">
            <div class="col-main">
              <div class="section-header">
                <h2 class="section-title animate-fade-in" v-animate-on-scroll>Biografie</h2>
                <div class="section-accent"></div>
              </div>

              <div class="card p-6 mb-6 animate-fade-in glass" v-animate-on-scroll>
                <p class="mb-4 text-lg">
                  Kanye Omari West (* 8. Juni 1977 in Atlanta, Georgia) ist ein US-amerikanischer
                  Rapper, Sänger, Songwriter, Musikproduzent, Modedesigner und Unternehmer.
                  Er zählt zu den einflussreichsten und umstrittensten Künstlern seiner Generation.
                  Bekannt für seine musikalische Innovation, seinen grenzüberschreitenden Stil und
                  seine oft provokanten Äußerungen, hat West die Popkultur nachhaltig geprägt.
                  Seine Karriere begann als Produzent für Roc-A-Fella Records, bevor er mit seinem
                  Debütalbum "The College Dropout" 2004 als Rapper durchstartete.
                </p>
                <p class="text-lg">
                  Über die Jahre entwickelte er sich zu einer Ikone, die nicht nur musikalische
                  Grenzen sprengte, sondern auch in der Modebranche mit Yeezy und in zahlreichen
                  Projekten Maßstäbe setzte. Seine Diskografie ist gespickt mit Alben, die soziale
                  Statements, Experimentierfreude und autobiografische Tiefe vereinen. Kontroversen
                  hielten ihn permanent im Fokus.
                </p>
              </div>

              <div class="card p-6 animate-fade-in glass" v-animate-on-scroll>
                <h3 class="text-2xl font-bold mb-4">Frühes Leben und Anfänge</h3>
                <p class="mb-4">
                  Aufgewachsen in Chicago, geprägt von der alleinerziehenden Mutter Dr. Donda West,
                  zeigte Kanye bereits in der Schule Interesse an Kunst und Musik. Beat-Produktionen
                  und Raptexte entstanden früh, das College brach er ab – Inspiration für den
                  Albumtitel "The College Dropout".
                </p>
                <p>
                  Erste Erfolge als Produzent für Jay-Z, Alicia Keys und Ludacris öffneten ihm die
                  Türen, doch sein Traum war immer die eigene Rapkarriere.
                </p>
              </div>
            </div>

            <div class="col-sidebar">
              <div class="kanye-infobox card animate-fade-in glass" v-animate-on-scroll>
                <h3 class="text-2xl font-bold mb-4">Steckbrief</h3>
                <ul class="info-list">
                  <li><strong>Voller Name:</strong> Kanye Omari West</li>
                  <li><strong>Geburtstag:</strong> 8. Juni 1977</li>
                  <li><strong>Geburtsort:</strong> Atlanta, Georgia, USA</li>
                  <li><strong>Nationalität:</strong> US-amerikanisch</li>
                  <li>
                    <strong>Berufe:</strong> Rapper, Sänger, Produzent, Songwriter,
                    Modedesigner, Unternehmer
                  </li>
                  <li><strong>Genre:</strong> Hip-Hop, Soul, R&B, Gospel, Electronic</li>
                  <li><strong>Aktive Jahre:</strong> 1996–heute</li>
                  <li><strong>Auszeichnungen:</strong> 24 Grammy Awards (Stand 2024)</li>
                  <li><strong>Ehemalige Ehepartnerin:</strong> Kim Kardashian (2014–2022)</li>
                  <li><strong>Kinder:</strong> North, Saint, Chicago, Psalm</li>
                </ul>
                <img
                    :src="profileImageUrl"
                    alt="Kanye West Profilbild"
                    class="mt-4 rounded-lg shadow-lg profile-img"
                    loading="lazy"
                />
              </div>
            </div>
          </section>

          <!-- Diskografie -->
          <section id="discography" class="mb-12 section-block">
            <div class="section-header">
              <h2 class="section-title animate-fade-in" v-animate-on-scroll>Diskografie</h2>
              <div class="section-accent"></div>
            </div>

            <div class="card p-6 animate-fade-in glass" v-animate-on-scroll>
              <div class="tabs mb-4 albums-filter row gap-4">
                <button
                    v-for="year in albumYears"
                    :key="year"
                    @click="activeAlbumYear = year"
                    :class="['chip', { active: activeAlbumYear === year }]"
                >
                  {{ year }}
                </button>
                <div class="spacer"></div>
                <button
                    class="chip ghost"
                    @click="activeAlbumYear = null"
                    :class="{ active: activeAlbumYear === null }"
                >
                  Alle Jahre
                </button>
              </div>

              <!-- Albums Grid -->
              <div class="albums-grid">
                <template v-if="activeAlbumYear === null">
                  <div
                      v-for="album in albums"
                      :key="album.title"
                      class="album-card animate-fade-in-up"
                      v-animate-on-scroll
                  >
                    <img
                        :src="album.cover"
                        :alt="album.title + ' Cover'"
                        class="album-cover-img"
                        loading="lazy"
                    />
                    <div class="album-meta">
                      <div class="album-title-row">
                        <h3 class="album-title">{{ album.title }}</h3>
                        <span class="badge">{{ album.year }}</span>
                      </div>
                      <p class="album-desc text-muted">{{ album.description }}</p>
                      <a :href="album.link" target="_blank" class="small">Mehr erfahren »</a>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div
                      v-for="album in albumsByYear[activeAlbumYear]"
                      :key="album.title"
                      class="album-card animate-fade-in-up"
                      v-animate-on-scroll
                  >
                    <img
                        :src="album.cover"
                        :alt="album.title + ' Cover'"
                        class="album-cover-img"
                        loading="lazy"
                    />
                    <div class="album-meta">
                      <div class="album-title-row">
                        <h3 class="album-title">{{ album.title }}</h3>
                        <span class="badge">{{ album.year }}</span>
                      </div>
                      <p class="album-desc text-muted">{{ album.description }}</p>
                      <a :href="album.link" target="_blank" class="small">Mehr erfahren »</a>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </section>

          <!-- Kontroversen -->
          <section id="controversies" class="mb-12 section-block">
            <div class="section-header">
              <h2 class="section-title animate-fade-in" v-animate-on-scroll>Kontroversen</h2>
              <div class="section-accent warn"></div>
            </div>

            <div class="card p-6 animate-fade-in glass" v-animate-on-scroll>
              <h3 class="text-2xl font-bold mb-4">Eine Geschichte der Kontroversen</h3>
              <p class="mb-4 text-lg">
                Seine provokanten Äußerungen – von spontanen Bühnenunterbrechungen bis zu politischen
                Statements – machen Kanye zur polarisierendsten Figur im Pop.
              </p>
              <ul class="list-disc pl-6 text-lg controversies-list">
                <li class="mb-2">
                  <strong>MTV VMAs 2009:</strong> Unterbrach Taylor Swifts Rede.
                </li>
                <li class="mb-2">
                  <strong>George W. Bush (2005):</strong> "George Bush cares nothing about black people."
                </li>
                <li class="mb-2">
                  <strong>Präsidentschaft 2020:</strong> Kurzlebige Kampagne, Diskussionen über Eignung und psychische Gesundheit.
                </li>
                <li class="mb-2">
                  <strong>Sklaverei & Politik:</strong> Heftige Debatten um kontroverse Kommentare.
                </li>
                <li class="mb-2">
                  <strong>Antisemitische Äußerungen 2022:</strong> Partnerschafts- und Image-Verlust.
                </li>
              </ul>
              <p class="mt-4 text-lg">
                Kaum ein Künstler seiner Generation zieht so viel Aufmerksamkeit mit Worten auf sich wie mit Musik.
              </p>
            </div>
          </section>

          <!-- Galerie -->
          <section id="gallery" class="mb-12 section-block">
            <div class="section-header">
              <h2 class="section-title animate-fade-in" v-animate-on-scroll>Bildergalerie</h2>
              <div class="section-accent"></div>
            </div>

            <div class="image-grid">
              <div
                  v-for="(image, index) in galleryImages"
                  :key="index"
                  class="image-item animate-fade-in-up"
                  v-animate-on-scroll
                  @click="openLightbox(index)"
              >
                <img :src="image.thumbnail" :alt="image.alt" loading="lazy" />
                <div class="image-overlay">
                  <span class="small">{{ image.alt }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <!-- Lightbox -->
      <Transition name="fade">
        <div v-if="lightboxOpen" class="lightbox" @click="closeLightbox">
          <button class="lightbox-close btn ghost" @click.stop="closeLightbox">✕</button>
          <button class="lightbox-nav prev btn ghost" @click.stop="navigateLightbox(-1)">‹</button>
          <img
              :src="galleryImages[currentImageIndex].full"
              :alt="galleryImages[currentImageIndex].alt"
              class="lightbox-image"
          />
          <button class="lightbox-nav next btn ghost" @click.stop="navigateLightbox(1)">›</button>
          <div class="lightbox-caption text-muted small mt-2">
            {{ galleryImages[currentImageIndex].alt }}
          </div>
        </div>
      </Transition>

      <footer class="kanye-footer text-center py-8">
        <div class="container">
          <p class="small">© Peru</p>
        </div>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from "vue";

interface Album {
  title: string;
  year: number;
  cover: string;
  description: string;
  link: string;
}

interface GalleryImage {
  thumbnail: string;
  full: string;
  alt: string;
}

export default defineComponent({
  name: "KanyeInfoProtected",
  directives: {
    "animate-on-scroll": {
      mounted(el: HTMLElement) {
        const obs = new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) {
                  e.target.classList.add("is-visible");
                  obs.unobserve(e.target);
                }
              });
            },
            { threshold: 0.1 }
        );
        obs.observe(el);
      },
    },
  },
  setup() {
    // Auth
    const correctPassword = "hash891219!";
    const loginPassword = ref("");
    const loginError = ref("");
    const isAuthenticated = ref(false);
    function login() {
      if (loginPassword.value === correctPassword) {
        isAuthenticated.value = true;
        loginPassword.value = "";
        loginError.value = "";
      } else {
        loginError.value = "Falsches Passwort";
      }
    }

    // Mobile menu
    const mobileMenuOpen = ref(false);

    // Hero & Profile
    const heroImageUrl =
        "https://preview.redd.it/kanye-west-graduation-3840x2160-v0-kjektcn4myv91.png?width=640&crop=smart&auto=webp&s=fa4b58c81acb3ec38c640cca6ef11d66d01c3cf3";
    const profileImageUrl =
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Kanye_West_at_the_2009_Tribeca_Film_Festival_%28crop_2%29.jpg/250px-Kanye_West_at_the_2009_Tribeca_Film_Festival_%28crop_2%29.jpg";

    // Discography
    const albums: Album[] = [
      { title: "The College Dropout", year: 2004, cover: "https://media.pitchfork.com/photos/5929aa8c5e6ef959693215e8/16:9/w_1280,c_limit/7b1099ec.jpg?mbid=social_retweet", description: "Sein wegweisendes Debüt, das ihn als Rapper und Produzent etablierte.", link: "https://de.wikipedia.org/wiki/The_College_Dropout" },
      { title: "Late Registration", year: 2005, cover: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Late_registration_cd_cover.jpg/250px-Late_registration_cd_cover.jpg", description: "Baute auf dem Erfolg des Debüts auf, mit orchestralen Elementen.", link: "https://de.wikipedia.org/wiki/Late_Registration" },
      { title: "Graduation", year: 2007, cover: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Graduation_Cover_1500x1500.jpg", description: "Ein stilistischer Wandel hin zu Arena-Hip-Hop und elektronischen Klängen.", link: "https://de.wikipedia.org/wiki/Graduation_(Album)" },
      { title: "808s & Heartbreak", year: 2008, cover: "https://i.scdn.co/image/ab67616d0000b273346d77e155d854735410ed18", description: "Ein experimentelles Album mit Auto-Tune und melancholischen Themen.", link: "https://de.wikipedia.org/wiki/808s_%26_Heartbreak" },
      { title: "My Beautiful Dark Twisted Fantasy", year: 2010, cover: "https://i.scdn.co/image/ab67616d0000b2733fb24570c0d5422b29ac394e", description: "Oft als sein Meisterwerk bezeichnet, opulent und vielschichtig.", link: "https://de.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy" },
      { title: "Yeezus", year: 2013, cover: "https://upload.wikimedia.org/wikipedia/en/0/03/Yeezus_album_cover.png", description: "Ein aggressives, minimalistisches und industriell klingendes Album.", link: "https://de.wikipedia.org/wiki/Yeezus" },
      { title: "The Life of Pablo", year: 2016, cover: "https://i.scdn.co/image/ab67616d0000b2732a7db835b912dc5014bd37f4", description: "Ein lebendiges, sich ständig weiterentwickelndes \"Living Album\".", link: "https://de.wikipedia.org/wiki/The_Life_of_Pablo" },
      { title: "Ye", year: 2018, cover: "https://upload.wikimedia.org/wikipedia/en/thumb/7/74/Ye_album_cover.jpg/250px-Ye_album_cover.jpg", description: "Ein kurzes, introspektives Album, das persönliche Kämpfe thematisiert.", link: "https://de.wikipedia.org/wiki/Ye_(Album)" },
      { title: "Kids See Ghosts", year: 2018, cover: "https://atwoodmagazine.com/wp-content/uploads/2018/06/uaNIo6X.jpg", description: "Kollaborationsalbum mit Kid Cudi unter Kids See Ghosts.", link: "https://de.wikipedia.org/wiki/Kids_See_Ghosts" },
      { title: "Jesus Is King", year: 2019, cover: "https://thinkchristian-website.imgix.net/articleImages/2019/jesus-is-king-craft.png?crop=focalpoint&fit=crop&fp-x=0.5&fp-y=0.5&h=500&ixlib=php-1.1.0&q=80&w=800&s=0b59e8ef62f71d7347d66ab11432c8d9", description: "Sein erstes Gospel-Album, neue musikalische Richtung.", link: "https://de.wikipedia.org/wiki/Jesus_Is_King" },
      { title: "Donda", year: 2021, cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjshGbXgjo0umSQJACQcIsTv-B4NrFeLOQUw&s", description: "Ein umfangreiches Album, seiner verstorbenen Mutter gewidmet.", link: "https://de.wikipedia.org/wiki/Donda_(Album)" },
      { title: "Vultures 1", year: 2024, cover: "https://preview.redd.it/vultures-1-released-1-year-ago-today-v0-bj488dv0z3ie1.png?width=828&format=png&auto=webp&s=a72860bb238c14a59c4a7ba66e8c571072ebc135", description: "Kollaboration mit Ty Dolla Sign unter ¥$.", link: "https://de.wikipedia.org/wiki/Vultures_1" },
    ];

    const albumYears = computed<number[]>(() =>
        Array.from(new Set(albums.map((a) => a.year))).sort((a, b) => b - a)
    );

    // Set default active year immediately to avoid empty render
    const activeAlbumYear = ref<number | null>(albumYears.value[0] ?? null);

    const albumsByYear = computed<Record<number, Album[]>>(() => {
      return albums.reduce((acc, a) => {
        if (!acc[a.year]) acc[a.year] = [];
        acc[a.year].push(a);
        return acc;
      }, {} as Record<number, Album[]>);
    });

    // Gallery
    const galleryImages: GalleryImage[] = [
      {
        thumbnail:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhySvY0ku51SBdWFf4CkglcdWLWc8bQMHORNw4rAQ52c35CHcX2v_EaVUYpFWHdKGLbxs&usqp=CAU",
        full:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhySvY0ku51SBdWFf4CkglcdWLWc8bQMHORNw4rAQ52c35CHcX2v_EaVUYpFWHdKGLbxs&usqp=CAU",
        alt: "Kanye West auf der Bühne",
      },
      {
        thumbnail: "https://thepolitic.org/wp-content/uploads/2022/10/161118111655-kanye-west.jpg",
        full: "https://thepolitic.org/wp-content/uploads/2022/10/161118111655-kanye-west.jpg",
        alt: "Kanye West im Studio",
      },
      {
        thumbnail:
            "https://www.rollingstone.com/wp-content/uploads/2018/06/rs-188588-109561363.jpg?w=1581&h=1054&crop=1",
        full:
            "https://www.rollingstone.com/wp-content/uploads/2018/06/rs-188588-109561363.jpg?w=1581&h=1054&crop=1",
        alt: "Kanye West mit Fans",
      },
      {
        thumbnail:
            "https://media.gq.com/photos/5ad93798ceb93861adb912d8/16:9/w_2560%2Cc_limit/kanye-west-0814-GQ-FEKW01.01.jpg",
        full:
            "https://media.gq.com/photos/5ad93798ceb93861adb912d8/16:9/w_2560%2Cc_limit/kanye-west-0814-GQ-FEKW01.01.jpg",
        alt: "Kanye West bei einer Fashion Show",
      },
      {
        thumbnail:
            "https://images.tagesschau.de/image/ca2c1af8-77f2-4b32-9a50-955ebf723c71/AAABlg1p7qo/AAABmKJiwCE/4x3/kanye-west-115.jpg?width=1280",
        full:
            "https://images.tagesschau.de/image/ca2c1af8-77f2-4b32-9a50-955ebf723c71/AAABlg1p7qo/AAABmKJiwCE/4x3/kanye-west-115.jpg?width=1280",
        alt: "Kanye West in einem Musikvideo",
      },
      {
        thumbnail: "https://img.zeit.de/kultur/musik/2016-02/kanye-west/wide__1000x562",
        full: "https://img.zeit.de/kultur/musik/2016-02/kanye-west/wide__1000x562",
        alt: "Kanye West während einer Rede",
      },
    ];

    // Lightbox
    const lightboxOpen = ref(false);
    const currentImageIndex = ref(0);
    function openLightbox(i: number) {
      currentImageIndex.value = i;
      lightboxOpen.value = true;
      document.body.style.overflow = "hidden";
    }
    function closeLightbox() {
      lightboxOpen.value = false;
      document.body.style.overflow = "";
    }
    function navigateLightbox(dir: -1 | 1) {
      let idx = currentImageIndex.value + dir;
      if (idx < 0) idx = galleryImages.length - 1;
      if (idx >= galleryImages.length) idx = 0;
      currentImageIndex.value = idx;
    }
    function handleKeydown(e: KeyboardEvent) {
      if (!lightboxOpen.value) return;
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
      if (e.key === "Escape") closeLightbox();
    }

    // Scroll with offset for sticky nav
    function scrollTo(id: string) {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 72; // nav height offset
      window.scrollTo({ top, behavior: "smooth" });
    }

    onMounted(() => {
      window.addEventListener("keydown", handleKeydown);
    });
    onUnmounted(() => {
      window.removeEventListener("keydown", handleKeydown);
    });

    return {
      // auth
      loginPassword,
      loginError,
      isAuthenticated,
      login,
      // nav
      mobileMenuOpen,
      // hero/profile
      heroImageUrl,
      profileImageUrl,
      // discography
      albums,
      albumYears,
      activeAlbumYear,
      albumsByYear,
      // gallery
      galleryImages,
      // lightbox
      lightboxOpen,
      currentImageIndex,
      openLightbox,
      closeLightbox,
      navigateLightbox,
      // scroll
      scrollTo,
    };
  },
});
</script>

<style scoped>
/* Layout wrapper */
.suround {
  padding: 2.5rem;
  gap: 2.5rem;
  background: radial-gradient(1200px 600px at 10% 10%, rgba(34, 197, 94, 0.08), transparent 40%),
  radial-gradient(1200px 600px at 90% 20%, rgba(245, 158, 11, 0.06), transparent 40%);
  border-radius: 5px;
}

/* Utilities missing in global CSS */
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-4 { gap: 1rem; }
.flex { display: flex; }

/* Login */
.login-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--bg);
  background-image: linear-gradient(180deg, rgba(17,24,39,0.6), rgba(17,24,39,0.9));
}
.login-card {
  max-width: 420px;
  width: 100%;
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.glass {
  backdrop-filter: saturate(1.2) blur(6px);
  background: linear-gradient(180deg, rgba(26,26,26,0.9), rgba(26,26,26,0.9)), var(--card);
}
.login-header {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary) 0%, #16a34a 100%);
  color: #0b1220;
  font-weight: 800;
  margin-bottom: 6px;
}
.login-body {
  display: grid;
  gap: 10px;
}
.input.enhanced {
  border: 1px solid var(--border);
  background: #161b22;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input.enhanced:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}
.login-button {
  margin-top: 6px;
}
.error-text {
  color: var(--danger);
  margin-top: 6px;
}
.login-foot {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
}

/* Page & Hero */
.kanye-page {
  background-color: var(--bg);
  min-height: 100vh;
  position: relative;
}
.kanye-hero {
  position: relative;
  height: 62vh;
  background-image: var(--bg-image);
  background-size: cover;
  background-position: center;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: -60px;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background:
      radial-gradient(800px 300px at 20% 20%, rgba(34,197,94,0.15), transparent 60%),
      linear-gradient(180deg, rgba(17,24,39,0.6), rgba(17,24,39,0.8));
}
.kanye-hero-content {
  position: relative;
  z-index: 1;
  max-width: 900px;
  padding: 0 16px;
}
.title-xl {
  font-size: clamp(3rem, 7vw, 5rem);
  letter-spacing: 0.15em;
  text-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
}
.subtitle {
  font-size: clamp(1.1rem, 2.4vw, 1.6rem);
}
.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* Navigation */
.kanye-nav-fixed {
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 1001;
  padding: 10px 0;
}
.nav-elevate {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.nav-content {
  position: relative;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary) 0%, #16a34a 100%);
  color: #0b1220;
  font-weight: 800;
}
.nav-link {
  transition: transform 0.15s ease, color 0.2s ease, border-color 0.2s ease;
}
.nav-link:hover {
  transform: translateY(-1px);
}
.mobile-menu-toggle {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
}
.mobile-menu-toggle .bar {
  display: block;
  width: 25px;
  height: 3px;
  background: var(--text);
  margin: 4px 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.mobile-menu-toggle .bar.open:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.mobile-menu-toggle .bar.open:nth-child(2) {
  opacity: 0;
}
.mobile-menu-toggle .bar.open:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}
.nav-links { display: flex; }
.nav-links.open { display: flex; }

/* Sections */
.section-block {
  scroll-margin-top: 84px; /* for sticky nav offset */
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.section-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.section-accent {
  height: 2px;
  flex: 1;
  background: linear-gradient(90deg, rgba(34,197,94,0.25), transparent);
}
.section-accent.warn {
  background: linear-gradient(90deg, rgba(245,158,11,0.35), transparent);
}

/* Main Layout */
.col-main { flex: 3; min-width: 300px; }
.col-sidebar { flex: 1; min-width: 280px; }

/* Infobox */
.kanye-infobox {
  padding: 20px;
  border: 1px solid var(--border);
}
.kanye-infobox img.profile-img {
  width: 100%;
  object-fit: cover;
  margin-top: 15px;
  border: 1px solid var(--border);
  transition: transform 0.3s ease;
}
.kanye-infobox img.profile-img:hover {
  transform: scale(1.02);
}
.info-list {
  list-style: none;
  padding: 0;
  margin-top: 15px;
}
.info-list li {
  margin-bottom: 8px;
  border-bottom: 1px dashed var(--border);
  padding-bottom: 8px;
}
.info-list li:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.info-list strong {
  color: var(--primary);
  margin-right: 5px;
}

/* Diskografie */
.albums-filter {
  align-items: center;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(26, 26, 26, 0.9);
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}
.chip:hover { transform: translateY(-1px); }
.chip.active {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08));
  color: #c9f7d5;
}
.chip.ghost {
  background: transparent;
}
.spacer {
  flex: 1;
}

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.album-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(180deg, #141922, #1a1a1a);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.20);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.album-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35);
}
.album-cover-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
  border-bottom: 1px solid var(--border);
}
.album-meta {
  padding: 12px;
  display: grid;
  gap: 8px;
}
.album-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.album-title {
  font-size: 1.05rem;
  font-weight: 700;
}
.album-desc {
  min-height: 48px;
}

/* Kontroversen */
.controversies-list {
  border-left: 2px solid rgba(245,158,11,0.35);
  padding-left: 12px;
}

/* Galerie */
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.image-item {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: #0b1220;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.2s ease;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.20);
}
.image-item:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.35);
  border-color: var(--primary);
}
.image-item img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
}
.image-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 8px 12px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.65));
  color: #e5e7eb;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(8px);
}
.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 2rem;
  color: white;
  background: transparent;
  border: none;
}
.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 3rem;
  color: white;
  padding: 10px;
  cursor: pointer;
  z-index: 2001;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  height: 60px;
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}
.lightbox-nav:hover { background: rgba(0, 0, 0, 0.6); }
.lightbox-nav.prev { left: 20px; }
.lightbox-nav.next { right: 20px; }
.lightbox-image {
  max-width: min(92%, 1100px);
  max-height: 80%;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
  animation: lightbox-fade-in 0.3s ease-out;
}
.lightbox-caption {
  margin-top: 15px;
  color: white;
  font-size: 1.1rem;
}

/* Footer */
.kanye-footer {
  background-color: var(--card);
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.9rem;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; } to { opacity: 1; }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes lightbox-fade-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in { opacity: 0; transition: opacity 0.6s ease-out; }
.animate-fade-in.is-visible { opacity: 1; }
.animate-fade-in-up {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.animate-fade-in-up.is-visible {
  opacity: 1; transform: translateY(0);
}
.animate-fade-in-up.delay-200 { transition-delay: 0.2s; }
.animate-fade-in-up.delay-400 { transition-delay: 0.4s; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Responsive */
@media (max-width: 768px) {
  .mobile-menu-toggle { display: block; }
  .nav-links {
    display: none;
  }
  .nav-links.open {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background-color: var(--card);
    border-top: 1px solid var(--border);
    padding: 8px 0;
  }
  .nav-links.open .btn {
    width: 100%;
    text-align: left;
    padding: 12px 16px;
  }
  .kanye-nav-fixed { z-index: 1000; }

  .title-xl { font-size: 2.6rem; letter-spacing: 0.08em; }
  .subtitle { font-size: 1.2rem; }
  .hero-actions { flex-wrap: wrap; }

  .col-main, .col-sidebar { flex: 1 1 100%; min-width: unset; }
  .image-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .lightbox-nav { font-size: 2rem; height: 40px; width: 40px; }
  .interr { display: block; }
}
</style>
