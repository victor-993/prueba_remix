import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression, LatLngTuple } from "leaflet";
import { Station } from "../types/types";
//import { Link } from "@remix-run/react"; 

interface MapProps {
  posix?: LatLngExpression | LatLngTuple;
  zoom?: number;
  stations?: Station[];
}

const defaults = {
  zoom: 6,
  posix: [4.5709, -74.2973] as LatLngTuple,
};

const Map = ({ zoom = defaults.zoom, posix, stations }: MapProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // 🚀 Evita errores de SSR en Remix
  }, []);

  if (!isClient) return <div className="h-[80vh] w-full bg-gray-200" />; // Placeholder mientras carga el mapa

  return (
    <MapContainer center={posix} zoom={zoom} className="h-[80vh] w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stations?.map((station) => (
        <Marker key={station.id} position={[station.latitude, station.longitude]}>
          <Popup>
            <div>
              <a href={`/clima/${station.id}`} className="text-blue-600 underline" >
                <strong>📍 {station.department}, {station.municipality}, {station.name}</strong>
              </a>
              <br />
              🌱 Cultivos: {station.crops.length > 0 ? station.crops.join(", ") : "No disponible"}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
