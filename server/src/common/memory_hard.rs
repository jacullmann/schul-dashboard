//! Runs memory-hard hashing (Argon2 for passwords, scrypt for encryption
//! keys) on the blocking pool, at most one job per CPU core at a time.
//!
//! Each job holds roughly 16-19 MiB for as long as it occupies a core. The
//! blocking pool would otherwise run up to 512 of them at once, so a burst of
//! sign-ins could exhaust the server's memory; past one job per core extra
//! concurrency only adds memory, never throughput. Waiting callers queue on
//! the semaphore, which costs nothing but a parked future.

use crate::error::AppError;
use std::{
    num::NonZeroUsize,
    sync::{Arc, LazyLock},
    thread::available_parallelism,
};
use tokio::sync::Semaphore;

/// Sized from the CPU quota the container actually gets, not the host's cores.
static SLOTS: LazyLock<Arc<Semaphore>> = LazyLock::new(|| {
    let cores = available_parallelism().map_or(1, NonZeroUsize::get);
    Arc::new(Semaphore::new(cores))
});

pub async fn run<T, F>(job: F) -> Result<T, AppError>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
{
    let slot = Arc::clone(&SLOTS)
        .acquire_owned()
        .await
        .map_err(|_| AppError::internal("Memory-hard job queue closed"))?;

    // The slot moves into the job, so a request cancelled mid-hash (client
    // gone, timeout) keeps the core counted until the hash really ends.
    tokio::task::spawn_blocking(move || {
        let _slot = slot;
        job()
    })
    .await
    .map_err(|e| AppError::internal(format!("Memory-hard job failed: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use tokio::task::JoinSet;

    #[tokio::test]
    async fn never_runs_more_jobs_than_cores_at_once() {
        let running = Arc::new(AtomicUsize::new(0));
        let peak = Arc::new(AtomicUsize::new(0));

        let mut jobs = JoinSet::new();
        for _ in 0..16 {
            let (running, peak) = (Arc::clone(&running), Arc::clone(&peak));
            jobs.spawn(run(move || {
                let now = running.fetch_add(1, Ordering::SeqCst) + 1;
                peak.fetch_max(now, Ordering::SeqCst);
                std::thread::sleep(std::time::Duration::from_millis(5));
                running.fetch_sub(1, Ordering::SeqCst);
            }));
        }
        while let Some(job) = jobs.join_next().await {
            job.unwrap().unwrap();
        }

        let cores = available_parallelism().map_or(1, NonZeroUsize::get);
        assert!(peak.load(Ordering::SeqCst) <= cores);
    }
}
