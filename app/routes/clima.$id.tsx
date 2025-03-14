import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunctionArgs } from "@remix-run/node";
import ClimateChart from "~/components/ClimateChart";
import { obtenerNombreMes } from "~/utils/dateUtils";
import type { ClimateData, HistoricalData } from "~/types/types";

// 🔹 Función `loader` que se ejecuta en el servidor antes de renderizar la página
export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  let climateData: ClimateData | null = null;
  let historicalData: HistoricalData[] = [];

  try {
    // 🔹 Obtener datos climáticos
    const climateRes = await fetch(
      `https://webapi.aclimate.org/api/Historical/Climatology/${id}/json`
    );

    if (!climateRes.ok) throw new Response("Not Found", { status: 404 });

    const data: ClimateData[] = await climateRes.json();
    climateData = data[0];
  } catch (error) {
    console.error("Error al obtener datos climáticos:", error);
  }

  try {
    // 🔹 Obtener datos históricos
    const historicalRes = await fetch(
      `https://webapi.aclimate.org/api/Historical/HistoricalClimatic/${id}/json`
    );

    if (!historicalRes.ok) throw new Response("Not Found", { status: 404 });

    historicalData = await historicalRes.json();
  } catch (error) {
    console.error("Error al obtener datos históricos:", error);
  }

  return json({ climateData, historicalData });
}

// 🔹 Componente principal de la página
export default function ClimatePage() {
  const { climateData, historicalData } = useLoaderData<typeof loader>();

  if (!climateData) {
    return <h2 className="text-red-600 text-center mt-10">No hay datos disponibles para esta estación</h2>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Clima de la estación {climateData.weather_station}</h1>

      <div className="bg-white shadow-md rounded-lg p-4 mb-6 overflow-x-auto">
        <h2 className="text-xl font-bold mb-2">Datos Mensuales</h2>
        <table className="w-full min-w-max border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-sm md:text-base">
              <th className="border p-2">Mes</th>
              <th className="border p-2">Temp. Máx (°C)</th>
              <th className="border p-2">Temp. Mín (°C)</th>
              <th className="border p-2">Precipitación (mm)</th>
              <th className="border p-2">Radiación Solar</th>
            </tr>
          </thead>
          <tbody>
            {climateData?.monthly_data.map((monthData) => {
              const tMax = monthData.data.find((d) => d.measure === "t_max")?.value ?? "-";
              const tMin = monthData.data.find((d) => d.measure === "t_min")?.value ?? "-";
              const prec = monthData.data.find((d) => d.measure === "prec")?.value ?? "-";
              const solRad = monthData.data.find((d) => d.measure === "sol_rad")?.value ?? "-";

              return (
                <tr key={monthData.month} className="text-center text-sm md:text-base">
                  <td className="border p-2">{obtenerNombreMes(monthData.month)}</td>
                  <td className="border p-2">{tMax}</td>
                  <td className="border p-2">{tMin}</td>
                  <td className="border p-2">{prec}</td>
                  <td className="border p-2">{solRad}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {climateData && <ClimateChart climateData={climateData} historicalData={historicalData} />}
    </div>
  );
}
