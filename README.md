# Unidades Geológicas de Chile

Visor web (PWA) de las formaciones, estratos, grupos, complejos, intrusivos y volcanes de Chile descritos en las
Cartas Geológicas de Chile (SERNAGEOMIN): dónde afloran, de qué rocas son, qué edad tienen y con qué se correlacionan.

- **Mapa de calor por edad**: densidad de afloramientos, con una capa por período en su color de la tabla ICS (o una sola
  densidad). Los afloramientos salen de las geodatabases oficiales de 93 cartas; las unidades sin GDB aportan un punto dentro
  del marco de la carta que las describe (marca la carta, no el afloramiento).
- **Fichas**: tabla de unidades extraída de las cartas, del libro *The Geology of Chile* (Moreno y Gibbons, eds., 2007) y
  de bibliografía; 650 unidades revisadas a mano contra el texto de la carta.
- **Edades**: Tabla Cronoestratigráfica Internacional 2024/12 (Comisión Internacional de Estratigrafía).

Los datos de `data/` se generan con `tools/armar_datos.py`. No es un producto oficial de SERNAGEOMIN: para trabajo formal,
consultar la carta original.
