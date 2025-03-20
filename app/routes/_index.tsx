import type { MetaFunction } from "@remix-run/node";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { lazy, Suspense, useEffect, useState } from "react";
import type { Station, Department } from "~/types/types";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};
const MapLeaftle = lazy(() => import("../components/Map.client"));

const API_URL =
  "https://webapi.aclimate.org/api/Geographic/61e59d829d5d2486e18d2ea8/json";

// 🔹 Cargar datos en el servidor antes de renderizar
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Response("Error al obtener datos", { status: 500 });
    }

    const data: Department[] = await response.json();

    // 🔹 Extraer estaciones del JSON
    const extractedStations: Station[] = data.flatMap((department) =>
      department.municipalities.flatMap((municipality) =>
        municipality.weather_stations.map((station) => ({
          id: station.id,
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          department: department.name,
          municipality: municipality.name,
          crops: [...new Map(
            station.ranges.map((r) => [
              r.crop_id, 
              { crop_name: r.crop_name, crop_id: r.crop_id }
            ])
          ).values(),],
        }))
      )
    );

    return json({ stations: extractedStations });
  } catch (error) {
    console.error("Error al cargar estaciones:", error);
    throw new Response("Error interno del servidor", { status: 500 });
  }
}

export default function Index() {
  const { stations } = useLoaderData<typeof loader>();
 // Estado para evitar que se renderice en SSR
 const [isClient, setIsClient] = useState(false);

 useEffect(() => {
   setIsClient(true);
 }, []);

 return (
   <div>
     {isClient ? (
       <Suspense fallback={<p>Cargando mapa...</p>}>
         <MapLeaftle posix={[4.5709, -74.2973]} stations={stations} />
       </Suspense>
     ) : (
       <p>Cargando mapa...</p>
     )}
   </div>
 );
}
