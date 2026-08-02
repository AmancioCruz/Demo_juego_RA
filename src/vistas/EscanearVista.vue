<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAlbumStore } from '@/stores/album'
import BotonApp from '@/componentes/interfaz/BotonApp.vue'

const album = useAlbumStore()
const videoRef = ref(null)
const camaraActiva = ref(false)
const cargando = ref(false)
const mensaje = ref('')
const stickerDesbloqueado = ref(null)
let flujoCamara

async function activarCamara() {
  if (cargando.value || camaraActiva.value) return

  if (!navigator.mediaDevices?.getUserMedia) {
    mensaje.value = 'Este navegador no permite abrir la camara.'
    return
  }

  cargando.value = true
  try {
    await nextTick()
    try {
      flujoCamara = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
    } catch {
      flujoCamara = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })
    }
    videoRef.value.srcObject = flujoCamara
    await videoRef.value.play()
    camaraActiva.value = true
    mensaje.value = 'Alinea el codigo dentro del marco.'
  } catch {
    mensaje.value = 'No se pudo abrir la camara. Revisa permisos o usa localhost/HTTPS.'
  } finally {
    cargando.value = false
  }
}

function detenerCamara() {
  flujoCamara?.getTracks().forEach((track) => track.stop())
  flujoCamara = null
  camaraActiva.value = false
}

function desbloquearSticker() {
  const sticker = album.escanearCodigo()
  stickerDesbloqueado.value = sticker
  mensaje.value = sticker
    ? `Sticker ${sticker.nombre} desbloqueado.`
    : 'No se encontro un sticker para desbloquear.'
}

onMounted(() => {
  requestAnimationFrame(() => activarCamara())
})

onBeforeUnmount(() => {
  detenerCamara()
})
</script>

<template>
  <div class="contenedor-vista escanear-vista">
    <header class="encabezado-vista">
      <p class="etiqueta">Escaner</p>
      <h1>Escanear sticker</h1>
      <p>Apunta la camara al codigo para desbloquear el sticker del lapiz.</p>
    </header>

    <section class="camara-qr">
      <video
        ref="videoRef"
        class="video-camara"
        :class="{ 'video-camara--activa': camaraActiva }"
        autoplay
        muted
        playsinline
      ></video>

      <div v-if="!camaraActiva" class="estado-camara">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7h3l1.4-2h7.2L17 7h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 7Zm8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          />
        </svg>
        <span>{{ cargando ? 'Abriendo camara...' : 'Camara lista' }}</span>
      </div>

      <div class="marco-escaneo" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </section>

    <p v-if="mensaje" class="mensaje-escaneo" role="status">{{ mensaje }}</p>

    <div class="acciones-escaner">
      <BotonApp v-if="!stickerDesbloqueado" bloque :disabled="cargando" @click="desbloquearSticker">
        Escanear codigo
      </BotonApp>

      <template v-else>
        <RouterLink class="boton-album" to="/album">Ver en album</RouterLink>
        <RouterLink class="boton-jugar" :to="{ name: 'juego', params: { id: stickerDesbloqueado.id } }">
          Jugar
        </RouterLink>
      </template>
    </div>

    <BotonApp v-if="!camaraActiva" bloque variante="secundario" :disabled="cargando" @click="activarCamara">
      Activar camara
    </BotonApp>
  </div>
</template>

<style scoped>
.escanear-vista {
  display: grid;
  gap: 14px;
}

.camara-qr {
  position: relative;
  min-height: 480px;
  overflow: hidden;
  border-radius: 28px;
  background:
    radial-gradient(circle at 80% 18%, rgba(215, 25, 32, 0.34), transparent 28%),
    linear-gradient(145deg, #102f53, #06345f);
  box-shadow: var(--sombra-fuerte);
}

.video-camara {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
}

.video-camara--activa {
  opacity: 1;
}

.estado-camara {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  color: #fff;
  text-align: center;
}

.estado-camara svg {
  width: 44px;
  height: 44px;
  fill: currentColor;
  opacity: 0.9;
}

.estado-camara span {
  font-weight: 900;
}

.marco-escaneo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(72vw, 270px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
}

.marco-escaneo span {
  position: absolute;
  width: 44px;
  height: 44px;
  border-color: #fff;
}

.marco-escaneo span:nth-child(1) {
  top: 0;
  left: 0;
  border-top: 5px solid;
  border-left: 5px solid;
  border-radius: 16px 0 0;
}

.marco-escaneo span:nth-child(2) {
  top: 0;
  right: 0;
  border-top: 5px solid;
  border-right: 5px solid;
  border-radius: 0 16px 0 0;
}

.marco-escaneo span:nth-child(3) {
  right: 0;
  bottom: 0;
  border-right: 5px solid;
  border-bottom: 5px solid;
  border-radius: 0 0 16px;
}

.marco-escaneo span:nth-child(4) {
  bottom: 0;
  left: 0;
  border-bottom: 5px solid;
  border-left: 5px solid;
  border-radius: 0 0 0 16px;
}

.mensaje-escaneo {
  margin: 0;
  padding: 12px;
  border-radius: 14px;
  color: var(--azul);
  background: var(--azul-claro);
  font-size: 0.88rem;
  font-weight: 900;
}

.acciones-escaner {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.acciones-escaner > .boton-app {
  grid-column: 1 / -1;
}

.boton-album,
.boton-jugar {
  min-height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
}

.boton-album {
  background: var(--azul);
}

.boton-jugar {
  background: var(--rojo);
}
</style>
