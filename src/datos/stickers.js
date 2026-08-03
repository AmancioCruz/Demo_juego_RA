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
      titulo: 'Coloca a Renato',
      descripcion: 'Pon a Renato sobre una superficie real y rodealo con tu celular.',
      objetivo: 'Coloca a Renato en realidad aumentada',
      elementos: ['Renato'],
    },
  },
]
