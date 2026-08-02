import stickerLapiz from '@/stickers/lapiz.png'

const rutaBase = import.meta.env.BASE_URL

export const stickersIniciales = [
  {
    id: 1,
    nombre: 'Lapiz',
    icono: 'LP',
    color: '#eef4fa',
    colorModelo: '#003f7d',
    imagen: stickerLapiz,
    modeloVista3d: `${rutaBase}modelos/renato.glb`,
    modelo3d: `${rutaBase}modelos/lapiz.glb`,
    desbloqueado: true,
    juego: {
      titulo: 'Encuentra a Renato',
      descripcion: 'Mueve la camara para buscar a Renato escondido en realidad aumentada.',
      objetivo: 'Encuentra a Renato 3 veces',
      elementos: ['Renato'],
    },
  },
]
