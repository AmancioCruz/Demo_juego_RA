<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAlbumStore } from '@/stores/album'
import TarjetaApp from '@/componentes/interfaz/TarjetaApp.vue'

const album = useAlbumStore()
const stickerDemo = computed(() => album.stickers[0])
</script>

<template>
  <div class="contenedor-vista inicio-vista">
    <header class="encabezado-inicio">
      <div class="perfil-mini">
        <div class="foto-mini">{{ album.usuario.foto }}</div>
        <div>
          <p>Hola, {{ album.usuario.nombre }}</p>
          <strong>Demo AR escolar</strong>
        </div>
      </div>
      <RouterLink to="/perfil" class="enlace-perfil" aria-label="Abrir perfil">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 7a7 7 0 0 1 14 0z"
          />
        </svg>
      </RouterLink>
    </header>

    <TarjetaApp class="tarjeta-escaneo">
      <div class="marco-qr" aria-label="Icono de escaneo">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 4h6v6H4zm2 2v2h2V6zm8-2h6v6h-6zm2 2v2h2V6zM4 14h6v6H4zm2 2v2h2v-2zm9-1h2v2h-2zm2 2h3v3h-5v-2h2zm-4-5h2v2h-2zm4 0h3v2h-3z"
          />
        </svg>
      </div>

      <div>
        <p class="etiqueta">Primer paso</p>
        <h1>Escanear nuevo sticker</h1>
        <p>Abre la camara, lee el codigo y desbloquea el sticker del lapiz.</p>
      </div>

      <RouterLink class="boton-escanear" to="/escanear">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7h3l1.4-2h7.2L17 7h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 7Zm8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          />
        </svg>
        Abrir camara
      </RouterLink>
    </TarjetaApp>

    <section class="hero-demo">
      <div>
        <p class="etiqueta">Demo disponible</p>
        <h2>Sticker del lapiz</h2>
        <p>Despues de escanear, podras ver el sticker y jugar en realidad aumentada.</p>
      </div>

      <div class="sticker-destacado">
        <img :src="stickerDemo.imagen" :alt="`Sticker ${stickerDemo.nombre}`" />
      </div>
    </section>

    <section class="pasos-demo" aria-label="Flujo de la demo">
      <TarjetaApp class="paso-demo">
        <span>1</span>
        <p>Escanea</p>
      </TarjetaApp>
      <TarjetaApp class="paso-demo">
        <span>2</span>
        <p>Ver sticker</p>
      </TarjetaApp>
      <TarjetaApp class="paso-demo">
        <span>3</span>
        <p>Juega AR</p>
      </TarjetaApp>
    </section>

    <RouterLink to="/album" class="enlace-album">Abrir album</RouterLink>
  </div>
</template>

<style scoped>
.inicio-vista {
  display: grid;
  gap: 16px;
}

.encabezado-inicio {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.perfil-mini {
  display: flex;
  align-items: center;
  gap: 10px;
}

.foto-mini {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--azul);
  font-weight: 900;
}

.perfil-mini p,
.hero-demo p,
.tarjeta-escaneo p {
  margin-bottom: 0;
  color: var(--texto-suave);
  line-height: 1.4;
}

.perfil-mini p {
  font-size: 0.82rem;
}

.perfil-mini strong {
  font-size: 0.95rem;
}

.enlace-perfil {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--azul);
  background: var(--azul-claro);
}

.enlace-perfil svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.hero-demo {
  min-height: 248px;
  padding: 22px;
  border-radius: 28px;
  display: grid;
  gap: 18px;
  justify-items: start;
  color: #fff;
  background:
    radial-gradient(circle at 84% 18%, rgba(215, 25, 32, 0.56), transparent 30%), var(--azul);
  box-shadow: var(--sombra-fuerte);
}

.hero-demo .etiqueta,
.hero-demo p {
  color: rgba(255, 255, 255, 0.84);
}

.hero-demo h1 {
  margin-bottom: 10px;
  font-size: 2rem;
  line-height: 1;
}

.hero-demo h2 {
  margin-bottom: 8px;
  font-size: 1.45rem;
}

.sticker-destacado {
  width: min(100%, 150px);
  height: 160px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.14);
  transform: rotate(4deg);
}

.sticker-destacado img {
  width: 92%;
  height: 92%;
  object-fit: contain;
}

.tarjeta-escaneo {
  padding: 18px;
  display: grid;
  gap: 14px;
}

.marco-qr {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: var(--azul);
  background: var(--azul-claro);
}

.marco-qr svg {
  width: 28px;
  height: 28px;
  fill: currentColor;
}

.tarjeta-escaneo h1 {
  margin-bottom: 6px;
  font-size: 1.75rem;
  line-height: 1.06;
}

.boton-escanear {
  min-height: 52px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: var(--rojo);
  font-weight: 900;
}

.boton-escanear svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.pasos-demo {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.paso-demo {
  min-height: 92px;
  padding: 12px 8px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
}

.paso-demo span {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--rojo);
  font-size: 0.9rem;
  font-weight: 900;
}

.paso-demo p {
  margin: 0;
  color: var(--texto);
  font-size: 0.78rem;
  font-weight: 900;
}

.enlace-album {
  min-height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--azul);
  font-weight: 900;
}

@media (min-width: 560px) {
  .hero-demo {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .hero-demo h1 {
    max-width: 300px;
    font-size: 2.25rem;
  }
}
</style>
