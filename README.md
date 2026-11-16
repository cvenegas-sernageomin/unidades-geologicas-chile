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

## Capa de yacimientos

Un punto por yacimiento (≈10.400, ≈2.000 con edad del depósito): tipo, sustancia, edad, roca de caja y, cuando el nombre calza, enlace a
la unidad del visor. Fuentes: base de Recursos Minerales de SERNAGEOMIN (GDB de las cartas), USGS MRDS (2012, dominio público) y las
edades de los principales depósitos tomadas a mano de Maksaev, Townley, Palacios y Camus (2007), cap. 6 de *The Geology of Chile*, de los apuntes del curso de Maksaev (U. de Chile), de las presentaciones y el apunte de Townley (DEGY) y de los artículos de su carpeta (73 depósitos). Se arma con
`tools/armar_yacimientos.py` (la tabla de Maksaev et al. está a mano en `tools/yac_maksaev.py`). La «edad» de algunas filas de las bases
es la de la roca de caja; cada ficha dice de dónde viene la edad.

