export const renderizarResultado = (cantidad) => {

    const contenedor = document.querySelector("#app");

    contenedor.innerHTML = `
        <div>
            <h2>Gestión de usuarios</h2>
            <p>La cantidad de usuarios es de: <strong>${cantidad}</strong></p>
        </div>
    `;
};