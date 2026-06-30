const descuento = 0;
console.log(descuento || 10); // 10 (0 es falsy, se reemplaza)
console.log(descuento ?? 10); //0 (0 no es nullish, se respeta)
const nombre = "";
console.log(nombre || "Invitado");
console.log(nombre ?? "Invitado");