"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Les icônes par défaut de Leaflet référencent des images via des chemins
// relatifs que le bundler Next.js ne résout pas — on les repointe vers le
// CDN unpkg (solution standard react-leaflet/Next.js) plutôt que de gérer
// l'import d'assets binaires pour trois pictogrammes.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type EcoleCarte = {
  id: string;
  nom: string;
  code_ecole: string;
  type_ecole_display: string;
  statut_ouverture_display: string;
  latitude: number | null;
  longitude: number | null;
};

// Centre approximatif de la Guinée — vue par défaut avant que les écoles
// géolocalisées ne soient chargées.
const CENTRE_GUINEE: [number, number] = [10.5, -11.0];

export default function CarteEcoles() {
  const [ecoles, setEcoles] = useState<EcoleCarte[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      const reponse = await fetch(`${API_URL}/public/ecoles/?page_size=500`);
      const donnees = await reponse.json();
      setEcoles((donnees.results ?? []).filter((e: EcoleCarte) => e.latitude !== null && e.longitude !== null));
      setChargement(false);
    }
    charger();
  }, []);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-lg border border-border">
      {chargement && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
          Chargement de la carte...
        </div>
      )}
      <MapContainer center={CENTRE_GUINEE} zoom={7} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {ecoles.map((e) => (
          <Marker key={e.id} position={[e.latitude as number, e.longitude as number]}>
            <Popup>
              <p className="font-semibold">{e.nom}</p>
              <p className="text-xs text-muted-foreground">{e.code_ecole} — {e.type_ecole_display}</p>
              <p className="text-xs">{e.statut_ouverture_display}</p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
