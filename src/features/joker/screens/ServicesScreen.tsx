type ServiceOffer = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  emoji: string;
  gradient: string;
};

// Pestana de muestra: pantalla de ejemplo para mostrar la idea de vender
// suscripciones de streaming ademas de comida. Sin logica real detras
// (ni carrito, ni backend): es solo para mostrar como quedaria.
const SERVICE_OFFERS: ServiceOffer[] = [
  {
    id: "netflix",
    name: "Netflix",
    tagline: "Series y peliculas, pantallas compartidas.",
    price: "$ 250 / mes",
    emoji: "🎬",
    gradient: "linear-gradient(135deg, #8b0000 0%, #1a0000 100%)"
  },
  {
    id: "disney",
    name: "Disney+",
    tagline: "Marvel, Star Wars, Pixar y mas.",
    price: "$ 220 / mes",
    emoji: "🏰",
    gradient: "linear-gradient(135deg, #0b2f9f 0%, #061a4d 100%)"
  },
  {
    id: "youtube",
    name: "YouTube Premium",
    tagline: "Sin anuncios, incluye YouTube Music.",
    price: "$ 200 / mes",
    emoji: "▶️",
    gradient: "linear-gradient(135deg, #b40000 0%, #1a1a1a 100%)"
  },
  {
    id: "hbo",
    name: "HBO Max",
    tagline: "Series originales y estrenos.",
    price: "$ 230 / mes",
    emoji: "🎭",
    gradient: "linear-gradient(135deg, #4a1b8f 0%, #1c0a38 100%)"
  },
  {
    id: "spotify",
    name: "Spotify Premium",
    tagline: "Musica sin limites, sin anuncios.",
    price: "$ 180 / mes",
    emoji: "🎧",
    gradient: "linear-gradient(135deg, #0f7a3d 0%, #06331a 100%)"
  },
  {
    id: "prime",
    name: "Amazon Prime Video",
    tagline: "Series, peliculas y envios gratis.",
    price: "$ 200 / mes",
    emoji: "📦",
    gradient: "linear-gradient(135deg, #0077a3 0%, #003a52 100%)"
  }
];

export function ServicesScreen() {
  return (
    <section className="joker-panel joker-services">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Servicios</p>
        <h2>Suscripciones disponibles</h2>
      </div>

      <div className="joker-services-grid">
        {SERVICE_OFFERS.map((offer) => (
          <article key={offer.id} className="joker-service-card">
            <div className="joker-service-card__banner" style={{ background: offer.gradient }}>
              <span className="joker-service-card__emoji">{offer.emoji}</span>
            </div>
            <div className="joker-service-card__body">
              <h3>{offer.name}</h3>
              <p>{offer.tagline}</p>
              <div className="joker-service-card__footer">
                <span className="joker-service-card__price">{offer.price}</span>
                <button type="button" className="joker-button">
                  Consultar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
