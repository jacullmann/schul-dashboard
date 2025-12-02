<template>
    <button class="cosmic-btn">

      <span class="glow-container">
        <span class="glow-layer glow-layer-1"></span>
        <span class="glow-layer glow-layer-2"></span>
        <span class="glow-layer glow-layer-3"></span>
        <span class="glow-noise"></span>
      </span>

      <span class="btn-border"></span>

      <span class="btn-content">
        <slot>Jetzt Loslegen</slot>
      </span>

      <!--<span class="stars-container">
        <span class="star-wrapper star-1">
          <svg class="star-svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C12 0 13 9 21 12C13 15 12 24 12 24C12 24 11 15 3 12C11 9 12 0 12 0Z" />
          </svg>
        </span>
        <span class="star-wrapper star-2">
          <svg class="star-svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C12 0 13 9 21 12C13 15 12 24 12 24C12 24 11 15 3 12C11 9 12 0 12 0Z" />
          </svg>
        </span>
        <span class="star-wrapper star-3">
          <svg class="star-svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C12 0 13 9 21 12C13 15 12 24 12 24C12 24 11 15 3 12C11 9 12 0 12 0Z" />
          </svg>
        </span>
      </span>-->

    </button>
</template>

<script lang="ts" setup>
</script>

<style scoped>

.cosmic-btn {
  --main-gradient: linear-gradient(
      to right,
      #FFA91A 0%,
      #FFA91A 7%,
      #FF335A 40%,
      #AF00FF 69%,
      #5600FF 100%
  );

  --pop-bezier: cubic-bezier(0.34, 1.56, 0.64, 1);

  position: relative;
  padding: 10px 1cqmax;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;

  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  color: white;
  background: rgba(15, 15, 15, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);

  transition: transform 0.3s var(--pop-bezier),
  background 0.3s ease,
  border-color 0.3s ease;
  z-index: 10;
}

.btn-content {
  position: relative;
  z-index: 5;
}

.glow-container {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: 0.5;

  transition: opacity 0.4s ease;
  border-radius: 12px;
}

.glow-layer {
  position: absolute;
  inset: 0;
  background: var(--main-gradient);
  border-radius: 12px;
  transition: transform 0.4s var(--pop-bezier);
}

.glow-layer-1 { filter: blur(8px);  opacity: 0.8; }
.glow-layer-2 { filter: blur(20px); opacity: 0.6; }
.glow-layer-3 { filter: blur(40px); opacity: 0.4; inset: -5px; }

.glow-noise {
  position: absolute;
  inset: -60px;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  opacity: 0.5;
  mask-image: radial-gradient(closest-side, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%);
  pointer-events: none;
}

.btn-border {
  position: absolute;
  inset: -1px;
  border-radius: 6px;
  z-index: -1;
  opacity: 1;
  background:#0F0F0FCC;
  border:1px solid #282828CC;
  transition: opacity 0.3s ease;
}


.cosmic-btn:hover {
  transform: scale(1.05);
  background: transparent;
  border-color: transparent;
}

.cosmic-btn:hover .glow-container {
  opacity: 1;
}

.cosmic-btn:hover .glow-layer {
  transform: scale(1.1);
}

.cosmic-btn:hover .btn-border {
  opacity: 1;
  background: var(--main-gradient);
  border:none;
}

.cosmic-btn:active {
  transform: scale(0.98);
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}
</style>