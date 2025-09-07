function calcularDelayHumano(texto) {
    const palabras = texto.trim().split(/\s+/).length;

    const tiempoLectura = palabras * 1000; // 1000ms por palabra (lectura)
    const tiempoEscritura = palabras * 2000; // 2000ms por palabra (escribir respuesta)

    let total = tiempoLectura + tiempoEscritura;

    if (total < 10000) total = 10000;     // mínimo 10s

    return total;
  }

module.exports = { calcularDelayHumano };