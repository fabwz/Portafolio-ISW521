const apiUrl = "https://jsonplaceholder.typicode.com/users"

export const obtenerUsuarios = async () => {
    try {
        const respuesta = await fetch(apiUrl);
        if (!respuesta.ok) throw Error("Error de red");
        return await respuesta.json();

    } catch (error) {
        console.error("Error al obtener los usuarios", error);
        return [];
    }
};