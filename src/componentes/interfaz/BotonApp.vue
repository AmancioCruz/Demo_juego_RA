<script setup>
defineProps({
  variante: { type: String, default: 'principal' },
  bloque: { type: Boolean, default: false },
  tipo: { type: String, default: 'button' },
})

defineEmits(['click'])
</script>

<template>
  <button
    :type="tipo"
    class="boton-app"
    :class="[`boton-app--${variante}`, { 'boton-app--bloque': bloque }]"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.boton-app {
  min-height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 900;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}

.boton-app:active {
  transform: scale(0.98);
}

.boton-app--principal {
  color: #fff;
  background: var(--rojo);
  box-shadow: 0 10px 22px rgba(215, 25, 32, 0.2);
}

.boton-app--secundario {
  color: var(--azul);
  background: var(--azul-claro);
}

.boton-app--azul {
  color: #fff;
  background: var(--azul);
}

.boton-app--bloque {
  width: 100%;
}
</style>
