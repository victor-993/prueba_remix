import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useParams } from "react-router";
import {
  CropRange,
  StationDataCrop,
  YieldEntry,
  AgronomicResponse,
  AgronomicData,
  Cultivar,
  Soil,
} from "~/types/types"; // Asegúrate de actualizar la ruta según la estructura de tu proyecto

const API_STATIONS =
  "https://webapi.aclimate.org/api/Geographic/61e59d829d5d2486e18d2ea8/json";
const API_YIELD_EXCEE = "https://webapi.aclimate.org/api/Forecast/YieldExceedance";
const API_YIELD = "https://webapi.aclimate.org/api/Forecast/Yield";
const API_AGRONOMIC = "https://webapi.aclimate.org/api/Agronomic/true/json";

/**
 * Loader para obtener los datos de la estación, yield y agronómicos en el servidor
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { state, municipality, station, crop } = params;

  if (!state || !municipality || !station || !crop) {
    throw new Response("Faltan parámetros", { status: 400 });
  }

  const decodedParams = {
    state: decodeURIComponent(state),
    municipality: decodeURIComponent(municipality),
    station: decodeURIComponent(station),
    crop: decodeURIComponent(crop),
  };

  let stationDataCrop: StationDataCrop | null = null;
  let yieldData: YieldEntry[] = [];
  let yieldExceeData: YieldEntry[] = [];
  let agronomicData: AgronomicData | null = null;

  const cultivarIds = new Set<string>();
  const soilIds = new Set<string>();
  let cultivars: Cultivar[] = [];
  let soils: Soil[] = [];

  try {
    /** 🔹 1. Obtener datos de estaciones */
    const response = await fetch(API_STATIONS, { cache: "no-store" });
    if (!response.ok) throw new Error("Error al obtener los datos de estaciones");
    const dataState: any[] = await response.json();

    /** 🔹 2. Buscar la estación específica */
    for (const stateData of dataState) {
      if (stateData.name.toLowerCase() === decodedParams.state.toLowerCase()) {
        for (const municipalityData of stateData.municipalities) {
          if (municipalityData.name.toLowerCase() === decodedParams.municipality.toLowerCase()) {
            for (const stationData of municipalityData.weather_stations) {
              if (stationData.name.toLowerCase() === decodedParams.station.toLowerCase()) {
                stationDataCrop = {
                  country: stateData.country.id,
                  state: stateData.name,
                  municipality: municipalityData.name,
                  station: stationData.name,
                  ...stationData,
                  ranges: stationData.ranges.filter(
                    (range: any) => range.crop_name.toLowerCase() === decodedParams.crop.toLowerCase()
                  ),
                };
                break;
              }
            }
          }
        }
      }
    }

    if (!stationDataCrop) throw new Response("Estación no encontrada", { status: 404 });

    /** 🔹 3. Obtener datos de Yield */
    const yieldResponse = await fetch(`${API_YIELD}/${stationDataCrop.id}/json`, { cache: "no-store" });
    if (yieldResponse.ok) {
      const yieldJson = await yieldResponse.json();
      yieldData = yieldJson.yield?.[0]?.yield || [];

      /** 🔹 Extraer cultivares y suelos únicos */
      yieldData.forEach((entry) => {
        cultivarIds.add(entry.cultivar);
        soilIds.add(entry.soil);
      });
    }

    const yieldExceeResponse = await fetch(`${API_YIELD_EXCEE}/${stationDataCrop.id}/json`, { cache: "no-store" });
    if (yieldExceeResponse.ok) {
      const yieldJson = await yieldExceeResponse.json();
      yieldExceeData = yieldJson.yield?.[0]?.yield || [];
    }

    console.log(yieldExceeResponse)

    /** 🔹 4. Obtener datos agronómicos */
    const agronomicResponse = await fetch(API_AGRONOMIC, { cache: "no-store" });
    if (agronomicResponse.ok) {
      const dataAgronomic: AgronomicResponse = await agronomicResponse.json();
      agronomicData = dataAgronomic.find((cp) => cp.cp_name.toLowerCase() === decodedParams.crop.toLowerCase()) || null;
    }

    /** 🔹 5. Filtrar cultivares y suelos según Yield */
    cultivars = agronomicData ? agronomicData.cultivars.filter((c) => cultivarIds.has(c.id)) : [];
    soils = agronomicData ? agronomicData.soils.filter((s) => soilIds.has(s.id)) : [];

    return json({
      stationDataCrop,
      yieldData,
      agronomicData,
      cultivars,
      soils,
      yieldExceeData,
    });
  } catch (error) {
    console.error("Error al cargar los datos:", error);
    throw new Response("Error interno del servidor", { status: 500 });
  }
};

/**
 * Componente de la página que renderiza la información en el cliente
 */
export default function CropStationPage() {
  const { state, municipality, station, crop } = useParams();
  const { stationDataCrop, yieldData, yieldExceeData, cultivars, soils, agronomicData } = useLoaderData<typeof loader>();

  console.log('yield ', yieldData);
  console.log('yield_Exceedance ', yieldExceeData);
  console.log('agronomic', agronomicData);
  console.log('weather station', stationDataCrop);
  console.log('cultivares', cultivars);
  console.log('suelos', soils);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Estación: {stationDataCrop?.name}</h1>
      <p><strong>Departamento:</strong> {stationDataCrop?.state}</p>
      <p><strong>Municipio:</strong> {stationDataCrop?.municipality}</p>
      <p><strong>Origen:</strong> {stationDataCrop?.origin}</p>
      <p><strong>Ubicación:</strong> {stationDataCrop?.latitude}, {stationDataCrop?.longitude}</p>

      <h2 className="text-xl font-semibold mt-4">Rangos de {crop}</h2>
      {stationDataCrop?.ranges.length > 0 ? (
        <ul className="list-disc list-inside">
          {stationDataCrop.ranges.map((range, index) => (
            <li key={`${range.crop_id}-${index}`}>
              {range.label} ({range.lower} - {range.upper} kg/ha)
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay información de rangos para este cultivo en esta estación.</p>
      )}

      <h2 className="text-xl font-semibold mt-4">Cultivares en Yield</h2>
      {cultivars.length > 0 ? (
        <ul className="list-disc list-inside">
          {cultivars.map((cultivar) => (
            <li key={cultivar.id}>{cultivar.name}</li>
          ))}
        </ul>
      ) : (
        <p>No hay cultivares encontrados en Yield.</p>
      )}

      <h2 className="text-xl font-semibold mt-4">Suelos en Yield</h2>
      {soils.length > 0 ? (
        <ul className="list-disc list-inside">
          {soils.map((soil) => (
            <li key={soil.id}>{soil.name}</li>
          ))}
        </ul>
      ) : (
        <p>No hay suelos encontrados en Yield.</p>
      )}
    </div>
  );
}
