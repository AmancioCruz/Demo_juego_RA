<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import BotonApp from '@/componentes/interfaz/BotonApp.vue'

const props = defineProps({
  sticker: { type: Object, required: true },
})

const contenedorRef = ref(null)
const mensaje = ref('')
const estadoRa = ref('Preparando a Renato...')
const xrSoportado = ref(false)
const sesionActiva = ref(false)
const planoEncontrado = ref(false)
const modeloColocado = ref(false)
const fotoOcupada = ref(false)
const avisoColocadoVisible = ref(false)
const avisoColocadoCerrado = ref(false)

const instruccionPrincipal = computed(() => {
  if (!sesionActiva.value) return 'Inicia la experiencia para colocar a Renato en tu espacio.'
  if (planoEncontrado.value) return 'Superficie lista. Toca la pantalla para colocar a Renato.'
  return 'Busca una superficie plana y toca la pantalla para colocar a Renato.'
})

let escena
let camara
let renderizador
let modeloRenato
let reticulo
let controlador
let sesionXr
let espacioReferencia
let espacioVisor
let fuenteHitTest
let hitTestSolicitado = false
let anchorRenato
let temporizadorAvisoColocado
let enlaceGlCamara
let capturaPendiente = false
let saliendoExperiencia = false
let recursosLiberados = false

function prepararModelo(modelo) {
  modelo.traverse((objeto) => {
    if (objeto.isMesh) {
      objeto.frustumCulled = false
      objeto.castShadow = true
      if (!objeto.material || objeto.material.name === 'DefaultMaterial') {
        objeto.material = new THREE.MeshStandardMaterial({
          color: '#0057a8',
          roughness: 0.42,
        })
      }
    }
  })

  const caja = new THREE.Box3().setFromObject(modelo)
  const tamano = new THREE.Vector3()
  caja.getSize(tamano)
  const dimensionMayor = Math.max(tamano.x, tamano.y, tamano.z) || 1
  modelo.scale.setScalar(0.45 / dimensionMayor)
  modelo.position.set(0, 0, 0)
  modelo.updateWorldMatrix(true, true)

  const cajaEscalada = new THREE.Box3().setFromObject(modelo)
  const centro = new THREE.Vector3()
  cajaEscalada.getCenter(centro)
  modelo.position.set(-centro.x, -cajaEscalada.min.y, -centro.z)
  modelo.rotation.y = Math.PI
  return modelo
}

function cargarModeloRenato() {
  const cargador = new GLTFLoader()
  cargador.load(
    props.sticker.modeloVista3d,
    (gltf) => {
      modeloRenato = new THREE.Group()
      modeloRenato.matrixAutoUpdate = false
      modeloRenato.visible = false
      modeloRenato.add(prepararModelo(gltf.scene))
      escena.add(modeloRenato)
      mensaje.value = ''
    },
    (evento) => {
      if (!evento.total) return
      const avance = Math.round((evento.loaded / evento.total) * 100)
      mensaje.value = `Cargando Renato ${avance}%`
    },
    () => {
      mensaje.value = `No se pudo cargar Renato desde ${props.sticker.modeloVista3d}.`
    },
  )
}

function crearReticulo() {
  const geometria = new THREE.RingGeometry(0.11, 0.14, 36).rotateX(-Math.PI / 2)
  const material = new THREE.MeshBasicMaterial({
    color: '#ffd54f',
    transparent: true,
    opacity: 0.95,
  })
  const malla = new THREE.Mesh(geometria, material)
  malla.matrixAutoUpdate = false
  malla.visible = false
  escena.add(malla)
  return malla
}

function iniciarEscena() {
  const ancho = contenedorRef.value.clientWidth
  const alto = contenedorRef.value.clientHeight

  escena = new THREE.Scene()
  camara = new THREE.PerspectiveCamera(70, ancho / alto, 0.01, 30)

  renderizador = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })
  renderizador.xr.enabled = true
  renderizador.xr.setReferenceSpaceType('local-floor')
  renderizador.outputColorSpace = THREE.SRGBColorSpace
  renderizador.toneMapping = THREE.ACESFilmicToneMapping
  renderizador.toneMappingExposure = 0.82
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderizador.setSize(ancho, alto)
  renderizador.domElement.className = 'canvas-xr'
  contenedorRef.value.appendChild(renderizador.domElement)

  escena.add(new THREE.AmbientLight('#ffffff', 0.45))
  escena.add(new THREE.HemisphereLight('#ffffff', '#d6e0ea', 1.1))
  const luzPrincipal = new THREE.DirectionalLight('#fff7ec', 1.25)
  luzPrincipal.position.set(-2, 4, 3)
  escena.add(luzPrincipal)
  const luzRelleno = new THREE.DirectionalLight('#e7f2ff', 0.45)
  luzRelleno.position.set(3, 2, -2)
  escena.add(luzRelleno)

  reticulo = crearReticulo()
  cargarModeloRenato()

  controlador = renderizador.xr.getController(0)
  controlador.addEventListener('select', colocarModeloEnReticulo)
  escena.add(controlador)
}

async function revisarSoporteWebXr() {
  xrSoportado.value = Boolean(
    navigator.xr && (await navigator.xr.isSessionSupported('immersive-ar')),
  )
  mensaje.value = xrSoportado.value ? mensaje.value : 'Este navegador o dispositivo no soporta WebXR AR.'
  estadoRa.value = xrSoportado.value
    ? 'Listo para iniciar la colocacion de Renato.'
    : 'Este navegador o dispositivo no soporta WebXR AR.'
}

async function iniciarSesionRa() {
  if (!xrSoportado.value || sesionActiva.value) return

  try {
    sesionXr = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local-floor'],
      optionalFeatures: ['dom-overlay', 'anchors', 'camera-access'],
      domOverlay: { root: contenedorRef.value },
    })

    sesionXr.addEventListener('end', finalizarSesionRa)
    await renderizador.xr.setSession(sesionXr)
    espacioReferencia = await sesionXr.requestReferenceSpace('local-floor')
    espacioVisor = await sesionXr.requestReferenceSpace('viewer')
    fuenteHitTest = await sesionXr.requestHitTestSource({ space: espacioVisor })
    if ('XRWebGLBinding' in window) {
      enlaceGlCamara = new XRWebGLBinding(sesionXr, renderizador.getContext())
    }
    renderizador.xr.setReferenceSpace(espacioReferencia)
    renderizador.setAnimationLoop(renderizarFrameXr)

    sesionActiva.value = true
    planoEncontrado.value = false
    modeloColocado.value = false
    estadoRa.value = 'Escaneando superficies planas.'
  } catch {
    estadoRa.value = 'No se pudo iniciar WebXR AR. Usa Chrome Android con HTTPS.'
  }
}

function finalizarSesionRa() {
  if (recursosLiberados) return
  sesionActiva.value = false
  planoEncontrado.value = false
  modeloColocado.value = false
  hitTestSolicitado = false
  fuenteHitTest?.cancel?.()
  fuenteHitTest = null
  espacioReferencia = null
  espacioVisor = null
  enlaceGlCamara = null
  capturaPendiente = false
  anchorRenato?.delete?.()
  anchorRenato = null
  if (reticulo) reticulo.visible = false
  if (modeloRenato) modeloRenato.visible = false
  renderizador?.setAnimationLoop(null)
  sesionXr?.removeEventListener?.('end', finalizarSesionRa)
  sesionXr = null
  estadoRa.value = 'Listo para iniciar la colocacion de Renato.'
}

async function colocarModeloEnReticulo() {
  if (!reticulo?.visible || !modeloRenato || modeloColocado.value) return

  modeloRenato.matrix.copy(reticulo.matrix)
  modeloRenato.matrix.decompose(modeloRenato.position, modeloRenato.quaternion, modeloRenato.scale)
  modeloRenato.matrixAutoUpdate = false
  modeloRenato.visible = true
  modeloColocado.value = true
  reticulo.visible = false
  estadoRa.value = 'Renato quedo fijo en tu espacio.'
  mostrarAvisoColocado()

  const resultado = reticulo.userData.hitTestResult
  if (resultado && typeof resultado.createAnchor === 'function') {
    try {
      anchorRenato = await resultado.createAnchor()
    } catch {
      anchorRenato = null
    }
  }
}

function actualizarReticulo(frame) {
  if (!fuenteHitTest || modeloColocado.value) return

  const resultados = frame.getHitTestResults(fuenteHitTest)
  if (!resultados.length) {
    reticulo.visible = false
    planoEncontrado.value = false
    estadoRa.value = 'Escaneando superficies planas.'
    return
  }

  const resultado = resultados[0]
  const pose = resultado.getPose(espacioReferencia)
  if (!pose) return

  reticulo.visible = true
  planoEncontrado.value = true
  reticulo.matrix.fromArray(pose.transform.matrix)
  reticulo.userData.hitTestResult = resultado
  estadoRa.value = 'Superficie detectada.'
}

function actualizarAnchor(frame) {
  if (!anchorRenato || !modeloRenato?.visible) return
  const pose = frame.getPose(anchorRenato.anchorSpace, espacioReferencia)
  if (!pose) return
  modeloRenato.matrix.fromArray(pose.transform.matrix)
  modeloRenato.matrixWorldNeedsUpdate = true
}

function renderizarFrameXr(timestamp, frame) {
  if (!frame) return

  if (!hitTestSolicitado) hitTestSolicitado = true
  actualizarReticulo(frame)
  actualizarAnchor(frame)
  renderizador.render(escena, camara)
  if (capturaPendiente) capturarDesdeFrameXr(frame)
}

function reiniciar() {
  modeloColocado.value = false
  planoEncontrado.value = false
  avisoColocadoVisible.value = false
  avisoColocadoCerrado.value = false
  window.clearTimeout(temporizadorAvisoColocado)
  anchorRenato?.delete?.()
  anchorRenato = null
  if (modeloRenato) modeloRenato.visible = false
  if (reticulo) reticulo.visible = false
  estadoRa.value = sesionActiva.value
    ? 'Escaneando superficies planas.'
    : 'Listo para iniciar la colocacion de Renato.'
}

function mostrarAvisoColocado() {
  if (avisoColocadoCerrado.value) return
  avisoColocadoVisible.value = true
  window.clearTimeout(temporizadorAvisoColocado)
  temporizadorAvisoColocado = window.setTimeout(() => {
    avisoColocadoVisible.value = false
  }, 4200)
}

function cerrarAvisoColocado() {
  avisoColocadoCerrado.value = true
  avisoColocadoVisible.value = false
  window.clearTimeout(temporizadorAvisoColocado)
}

async function capturarFoto() {
  if (!renderizador || fotoOcupada.value) return
  fotoOcupada.value = true
  capturaPendiente = true
  mensaje.value = 'Preparando foto...'
}

async function capturarDesdeFrameXr(frame) {
  capturaPendiente = false
  const estadoCaptura = guardarEstadoCaptura()

  try {
    const blob = await crearBlobFoto(frame)

    if (!blob) {
      mensaje.value = 'Este navegador no permite capturar la camara de WebXR.'
      return
    }

    const nombreArchivo = `renato-ar-${Date.now()}.png`
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = nombreArchivo
    enlace.click()
    URL.revokeObjectURL(enlace.href)
    mensaje.value = 'Imagen guardada correctamente.'
  } catch {
    mensaje.value = 'Tu navegador no permitio capturar la camara de WebXR.'
  } finally {
    restaurarEstadoCaptura(estadoCaptura)
    fotoOcupada.value = false
  }
}

function guardarEstadoCaptura() {
  return {
    sesionActiva: sesionActiva.value,
    modeloColocado: modeloColocado.value,
    modelo: modeloRenato
      ? {
          visible: modeloRenato.visible,
          parent: modeloRenato.parent,
          matrix: modeloRenato.matrix.clone(),
          matrixWorld: modeloRenato.matrixWorld.clone(),
          matrixAutoUpdate: modeloRenato.matrixAutoUpdate,
          position: modeloRenato.position.clone(),
          quaternion: modeloRenato.quaternion.clone(),
          scale: modeloRenato.scale.clone(),
        }
      : null,
    reticulo: reticulo
      ? {
          visible: reticulo.visible,
          matrix: reticulo.matrix.clone(),
          matrixAutoUpdate: reticulo.matrixAutoUpdate,
        }
      : null,
    camara: camara
      ? {
          matrix: camara.matrix.clone(),
          matrixWorld: camara.matrixWorld.clone(),
          projectionMatrix: camara.projectionMatrix.clone(),
          matrixAutoUpdate: camara.matrixAutoUpdate,
        }
      : null,
  }
}

function restaurarEstadoCaptura(estado) {
  if (estado) {
    sesionActiva.value = estado.sesionActiva
    modeloColocado.value = estado.modeloColocado
  }

  if (estado?.modelo && modeloRenato) {
    if (estado.modelo.parent && modeloRenato.parent !== estado.modelo.parent) {
      estado.modelo.parent.add(modeloRenato)
    }
    modeloRenato.visible = estado.modelo.visible
    modeloRenato.matrix.copy(estado.modelo.matrix)
    modeloRenato.matrixWorld.copy(estado.modelo.matrixWorld)
    modeloRenato.matrixAutoUpdate = estado.modelo.matrixAutoUpdate
    modeloRenato.position.copy(estado.modelo.position)
    modeloRenato.quaternion.copy(estado.modelo.quaternion)
    modeloRenato.scale.copy(estado.modelo.scale)
    modeloRenato.matrixWorldNeedsUpdate = true
  }

  if (estado?.reticulo && reticulo) {
    reticulo.visible = estado.reticulo.visible
    reticulo.matrix.copy(estado.reticulo.matrix)
    reticulo.matrixAutoUpdate = estado.reticulo.matrixAutoUpdate
  }

  if (estado?.camara && camara) {
    camara.matrix.copy(estado.camara.matrix)
    camara.matrixWorld.copy(estado.camara.matrixWorld)
    camara.projectionMatrix.copy(estado.camara.projectionMatrix)
    camara.projectionMatrixInverse.copy(camara.projectionMatrix).invert()
    camara.matrixAutoUpdate = estado.camara.matrixAutoUpdate
  }

  if (estado?.modeloColocado && modeloRenato) modeloRenato.visible = true
  if (estado?.sesionActiva && !saliendoExperiencia) renderizador?.setAnimationLoop(renderizarFrameXr)
}

async function crearBlobFoto(frame) {
  const capturaCamara = obtenerCapturaCamaraXr(frame)
  if (!capturaCamara) return null

  const lienzoCamara = capturaCamara.lienzo
  const lienzoModelo = crearLienzoModeloXr(capturaCamara.vista, lienzoCamara.width, lienzoCamara.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzoCamara.width
  lienzo.height = lienzoCamara.height
  const contexto = lienzo.getContext('2d')

  contexto.drawImage(lienzoCamara, 0, 0, lienzo.width, lienzo.height)
  if (lienzoModelo) contexto.drawImage(lienzoModelo, 0, 0, lienzo.width, lienzo.height)
  const altoBanda = Math.max(88, lienzo.height * 0.12)
  contexto.fillStyle = 'rgba(6, 35, 64, 0.78)'
  contexto.fillRect(0, lienzo.height - altoBanda, lienzo.width, altoBanda)
  contexto.fillStyle = '#ffffff'
  contexto.font = `700 ${Math.max(24, lienzo.width * 0.036)}px Arial`
  contexto.textAlign = 'center'
  contexto.fillText('Renato en realidad aumentada', lienzo.width / 2, lienzo.height - altoBanda / 2 + 10)

  return await new Promise((resolve) => {
    lienzo.toBlob(resolve, 'image/png', 0.95)
  })
}

function obtenerCapturaCamaraXr(frame) {
  if (!enlaceGlCamara || !espacioReferencia) return null

  const pose = frame.getViewerPose(espacioReferencia)
  const vista = pose?.views?.find((vistaXr) => vistaXr.camera)
  if (!vista?.camera) return null

  const texturaCamara = enlaceGlCamara.getCameraImage(vista.camera)
  if (!texturaCamara) return null

  const ancho = vista.camera.width || renderizador.domElement.width
  const alto = vista.camera.height || renderizador.domElement.height
  const lienzo = copiarTexturaCamaraACanvas(texturaCamara, ancho, alto)
  return { lienzo, vista }
}

function crearLienzoModeloXr(vista, ancho, alto) {
  if (!vista || !modeloRenato?.visible) return null

  const lienzo = document.createElement('canvas')
  const escenaFoto = new THREE.Scene()
  const clonRenato = modeloRenato.clone(true)
  clonRenato.matrix.copy(modeloRenato.matrix)
  clonRenato.matrixWorld.copy(modeloRenato.matrixWorld)
  clonRenato.matrixAutoUpdate = modeloRenato.matrixAutoUpdate
  clonRenato.visible = true
  escena.children.forEach((objeto) => {
    if (objeto.isLight) escenaFoto.add(objeto.clone())
  })
  escenaFoto.add(clonRenato)

  const renderizadorFoto = new THREE.WebGLRenderer({
    canvas: lienzo,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })
  renderizadorFoto.outputColorSpace = THREE.SRGBColorSpace
  renderizadorFoto.toneMapping = THREE.ACESFilmicToneMapping
  renderizadorFoto.toneMappingExposure = renderizador.toneMappingExposure
  renderizadorFoto.setPixelRatio(1)
  renderizadorFoto.setSize(ancho, alto, false)
  renderizadorFoto.setClearColor(0x000000, 0)
  renderizadorFoto.autoClear = true

  const camaraFoto = new THREE.PerspectiveCamera()
  camaraFoto.projectionMatrix.fromArray(vista.projectionMatrix)
  camaraFoto.projectionMatrixInverse.copy(camaraFoto.projectionMatrix).invert()
  camaraFoto.matrixWorld.fromArray(vista.transform.matrix)
  camaraFoto.matrixWorldInverse.copy(camaraFoto.matrixWorld).invert()
  camaraFoto.matrixAutoUpdate = false

  try {
    escenaFoto.updateMatrixWorld(true)
    renderizadorFoto.render(escenaFoto, camaraFoto)
    return lienzo
  } finally {
    escenaFoto.remove(clonRenato)
    renderizadorFoto.dispose()
  }
}

function copiarTexturaCamaraACanvas(texturaCamara, ancho, alto) {
  const gl = renderizador.getContext()
  const estadoGl = guardarEstadoGl(gl)
  const framebuffer = gl.createFramebuffer()
  const texturaSalida = gl.createTexture()
  const programa = crearProgramaCopiaTextura(gl)
  const buffer = gl.createBuffer()
  try {
    gl.bindTexture(gl.TEXTURE_2D, texturaSalida)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ancho, alto, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texturaSalida, 0)
    gl.viewport(0, 0, ancho, alto)
    gl.useProgram(programa)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const posicion = gl.getAttribLocation(programa, 'posicion')
    const uv = gl.getAttribLocation(programa, 'uv')
    gl.enableVertexAttribArray(posicion)
    gl.vertexAttribPointer(posicion, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(uv)
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texturaCamara)
    gl.uniform1i(gl.getUniformLocation(programa, 'imagen'), 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    const pixeles = new Uint8Array(ancho * alto * 4)
    gl.readPixels(0, 0, ancho, alto, gl.RGBA, gl.UNSIGNED_BYTE, pixeles)

    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const contexto = lienzo.getContext('2d')
    const imagen = contexto.createImageData(ancho, alto)
    for (let fila = 0; fila < alto; fila += 1) {
      const origen = fila * ancho * 4
      const destino = (alto - fila - 1) * ancho * 4
      imagen.data.set(pixeles.subarray(origen, origen + ancho * 4), destino)
    }
    contexto.putImageData(imagen, 0, 0)
    return lienzo
  } finally {
    gl.deleteBuffer(buffer)
    gl.deleteProgram(programa)
    gl.deleteTexture(texturaSalida)
    gl.deleteFramebuffer(framebuffer)
    restaurarEstadoGl(gl, estadoGl)
    renderizador.state.reset()
  }
}

function guardarEstadoGl(gl) {
  return {
    framebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
    arrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
    currentProgram: gl.getParameter(gl.CURRENT_PROGRAM),
    activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
    texture2D: gl.getParameter(gl.TEXTURE_BINDING_2D),
    viewport: gl.getParameter(gl.VIEWPORT),
  }
}

function restaurarEstadoGl(gl, estado) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, estado.framebuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, estado.arrayBuffer)
  gl.useProgram(estado.currentProgram)
  gl.activeTexture(estado.activeTexture)
  gl.bindTexture(gl.TEXTURE_2D, estado.texture2D)
  gl.viewport(estado.viewport[0], estado.viewport[1], estado.viewport[2], estado.viewport[3])
}

function crearProgramaCopiaTextura(gl) {
  const vertice = compilarShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec2 posicion;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(posicion, 0.0, 1.0);
      }
    `,
  )
  const fragmento = compilarShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      uniform sampler2D imagen;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(imagen, vUv);
      }
    `,
  )
  const programa = gl.createProgram()
  gl.attachShader(programa, vertice)
  gl.attachShader(programa, fragmento)
  gl.linkProgram(programa)
  gl.deleteShader(vertice)
  gl.deleteShader(fragmento)
  return programa
}

function compilarShader(gl, tipo, codigo) {
  const shader = gl.createShader(tipo)
  gl.shaderSource(shader, codigo)
  gl.compileShader(shader)
  return shader
}

async function salirExperiencia() {
  saliendoExperiencia = true
  const sesionActual = sesionXr
  sesionXr = null

  try {
    if (sesionActual) {
      sesionActual.removeEventListener?.('end', finalizarSesionRa)
      try {
        await sesionActual.end()
      } catch {
        // La sesion puede haberse cerrado desde el navegador mientras se toca Salir.
      }
    }
    liberarRecursosRa()
  } finally {
    window.location.replace(obtenerRutaInicio())
  }
}

function obtenerRutaInicio() {
  return `${window.location.origin}${window.location.pathname}#/`
}

function liberarRecursosRa() {
  if (recursosLiberados) return
  recursosLiberados = true
  window.clearTimeout(temporizadorAvisoColocado)
  try {
    fuenteHitTest?.cancel?.()
  } catch {
    // Algunos navegadores invalidan la fuente cuando termina la sesion XR.
  }
  fuenteHitTest = null
  enlaceGlCamara = null
  capturaPendiente = false
  try {
    anchorRenato?.delete?.()
  } catch {
    // El anchor puede quedar invalidado al cerrar WebXR.
  }
  anchorRenato = null
  controlador?.removeEventListener('select', colocarModeloEnReticulo)
  try {
    renderizador?.setAnimationLoop(null)
    renderizador?.dispose()
  } catch {
    // Evita romper la redireccion si el renderer ya fue liberado por WebXR.
  }
  renderizador?.domElement?.remove()
  renderizador = null
}

function ajustarTamano() {
  if (!contenedorRef.value || !renderizador || !camara) return
  const ancho = contenedorRef.value.clientWidth
  const alto = contenedorRef.value.clientHeight
  camara.aspect = ancho / alto
  camara.updateProjectionMatrix()
  renderizador.setSize(ancho, alto)
}

onMounted(() => {
  iniciarEscena()
  revisarSoporteWebXr()
  window.addEventListener('resize', ajustarTamano)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', ajustarTamano)
  sesionXr?.removeEventListener?.('end', finalizarSesionRa)
  sesionXr?.end?.()
  liberarRecursosRa()
})
</script>

<template>
  <section class="juego-renato">
    <div class="panel-puntaje">
      <strong>{{ modeloColocado ? 'Listo' : 'AR' }}</strong>
      <span>{{ modeloColocado ? 'Renato colocado' : 'Coloca a Renato' }}</span>
      <BotonApp variante="secundario" @click="reiniciar">Reiniciar</BotonApp>
    </div>

    <div ref="contenedorRef" class="escena-renato">
      <div class="overlay-xr">
        <div v-if="!sesionActiva" class="estado-xr">
          <span :class="{ 'estado-xr__punto--activo': planoEncontrado || modeloColocado }"></span>
          <p>{{ estadoRa }}</p>
        </div>

        <div v-if="sesionActiva && !modeloColocado" class="instruccion-principal">
          <div class="icono-instruccion">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3a7 7 0 0 1 7 7c0 4.2-5.4 10-6.26 10.9a1 1 0 0 1-1.48 0C10.4 20 5 14.2 5 10a7 7 0 0 1 7-7Zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
              />
            </svg>
          </div>
          <p>{{ instruccionPrincipal }}</p>
        </div>

        <div v-if="modeloColocado && avisoColocadoVisible" class="aviso-colocado">
          <p>Renato quedo colocado. Rodealo para verlo completo.</p>
          <button type="button" aria-label="Cerrar aviso" @click="cerrarAvisoColocado">×</button>
        </div>

        <div v-if="sesionActiva" class="acciones-xr">
          <BotonApp variante="secundario" :disabled="fotoOcupada" @click="capturarFoto">
            {{ fotoOcupada ? 'Guardando...' : 'Foto' }}
          </BotonApp>
          <BotonApp variante="azul" @click="salirExperiencia">Salir</BotonApp>
        </div>

        <div v-if="!sesionActiva" class="inicio-xr">
          <div class="icono-xr">AR</div>
          <h2>Coloca a Renato</h2>
          <p>Busca una superficie plana y toca la pantalla para colocar a Renato.</p>
          <BotonApp bloque :disabled="!xrSoportado || !modeloRenato" @click="iniciarSesionRa">
            Iniciar RA
          </BotonApp>
          <p v-if="mensaje" class="mensaje-juego">{{ mensaje }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.juego-renato {
  display: grid;
  gap: 14px;
}

.panel-puntaje {
  padding: 14px;
  border: 1px solid var(--borde);
  border-radius: 18px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  background: #fff;
  box-shadow: var(--sombra);
}

.panel-puntaje strong {
  color: var(--rojo);
  font-size: 1.05rem;
}

.panel-puntaje span {
  color: var(--texto-suave);
  font-size: 0.82rem;
  font-weight: 900;
}

.escena-renato {
  position: relative;
  min-height: 540px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at 72% 18%, rgba(215, 25, 32, 0.18), transparent 25%),
    linear-gradient(145deg, #102f53, #06345f);
  box-shadow: var(--sombra);
}

:deep(.canvas-xr) {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100% !important;
  height: 100% !important;
}

.overlay-xr {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  pointer-events: none;
}

.estado-xr {
  align-self: start;
  margin: 14px;
  max-width: calc(100% - 28px);
  padding: 10px 12px;
  border-radius: 999px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--azul);
  background: rgba(255, 255, 255, 0.92);
  font-size: 0.82rem;
  font-weight: 900;
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 30px rgba(6, 35, 64, 0.18);
}

.estado-xr span {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--amarillo);
  box-shadow: 0 0 0 5px rgba(255, 213, 79, 0.22);
}

.estado-xr__punto--activo {
  background: var(--verde, #1fbf75) !important;
  box-shadow: 0 0 0 5px rgba(31, 191, 117, 0.2) !important;
}

.estado-xr p {
  margin: 0;
}

.instruccion-principal {
  align-self: start;
  justify-self: center;
  width: min(92%, 390px);
  margin-top: 76px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 22px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  color: #fff;
  background: rgba(6, 35, 64, 0.86);
  box-shadow:
    0 18px 40px rgba(6, 35, 64, 0.26),
    0 0 0 6px rgba(255, 213, 79, 0.1);
  backdrop-filter: blur(16px);
  animation: llamada-suave 2.4s ease-in-out infinite;
}

.icono-instruccion {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: var(--azul);
  background: var(--amarillo);
}

.icono-instruccion svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.instruccion-principal p {
  margin: 0;
  font-size: 1rem;
  font-weight: 950;
  line-height: 1.25;
}

.aviso-colocado {
  align-self: end;
  justify-self: center;
  width: min(92%, 390px);
  margin-bottom: 84px;
  padding: 10px 10px 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 18px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  color: #fff;
  background: rgba(6, 35, 64, 0.78);
  box-shadow: 0 14px 30px rgba(6, 35, 64, 0.22);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.aviso-colocado p {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 900;
  line-height: 1.25;
}

.aviso-colocado button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--azul);
  background: rgba(255, 255, 255, 0.92);
  font-size: 1.2rem;
  font-weight: 900;
}

.acciones-xr {
  align-self: end;
  justify-self: center;
  width: min(92%, 390px);
  margin-bottom: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  pointer-events: auto;
}

.inicio-xr {
  align-self: center;
  justify-self: center;
  width: min(86%, 330px);
  padding: 18px;
  border-radius: 22px;
  display: grid;
  gap: 12px;
  justify-items: center;
  color: var(--azul);
  background: rgba(255, 255, 255, 0.94);
  text-align: center;
  pointer-events: auto;
  box-shadow: var(--sombra);
}

.icono-xr {
  width: 62px;
  height: 62px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--rojo);
  font-size: 1.1rem;
  font-weight: 950;
}

.inicio-xr h2,
.inicio-xr p {
  margin: 0;
}

.inicio-xr p {
  color: var(--texto-suave);
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.35;
}

.mensaje-juego {
  color: var(--rojo);
}

@keyframes llamada-suave {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}
</style>
