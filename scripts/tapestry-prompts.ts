/**
 * Brainrothaus Tapestry Prompts
 *
 * Highly detailed prompts for AI image generation via Flux 2 Pro.
 * Each prompt is designed for large-format wall tapestry printing at 8192x8192.
 *
 * Guidelines followed:
 * - 100+ words per prompt
 * - "wall tapestry composition" + "designed for large format printing"
 * - Bold, saturated colors optimized for print
 * - Art style direction specified
 * - Ornate decorative borders / tapestry-worthy compositions
 * - NO text/words in any image (renders poorly in AI generation)
 */

export interface TapestryPrompt {
  slug: string;
  name: string;
  prompt: string;
}

export const TAPESTRY_PROMPTS: TapestryPrompt[] = [
  {
    slug: "terachad-ascension",
    name: "Terachad Ascension",
    prompt: `A breathtaking wall tapestry composition depicting a colossal Renaissance marble statue of an impossibly chiseled male figure ascending through layers of reality. The statue's physique is idealized beyond human proportion, every muscle fiber carved with Michelangelo-level precision. Cyberpunk neon circuits and holographic data streams weave through the marble cracks, glowing electric blue and hot magenta against the cold white stone. Behind the figure, a shattered classical temple merges with a futuristic cityscape of chrome towers and floating platforms. Golden ratio spirals emanate from the figure's jawline, suggesting divine facial harmony. Dramatic chiaroscuro lighting in the style of Caravaggio mixed with Blade Runner aesthetics. Rich burgundy velvet drapery frames the scene. Bold saturated colors of deep royal purple, molten gold, electric cyan, and marble white dominate the palette. An ornate decorative border of intertwined laurel wreaths and circuit board traces surrounds the entire composition. Designed for large format printing with exceptional detail at every scale. Oil painting crossed with digital art style, photorealistic marble texture, cinematic atmosphere.`,
  },
  {
    slug: "mewing-cathedral",
    name: "Mewing Cathedral",
    prompt: `A magnificent wall tapestry composition in the style of a Baroque oil painting, depicting a Greek god with a perfectly sculpted jawline seated upon a golden throne inside a soaring gothic cathedral. The deity's hand rests beneath the chin in a deliberate, meditative pose, jaw pressed firmly forward, eyes closed in transcendent focus. Shafts of divine golden light pour through elaborate stained glass windows, casting kaleidoscopic patterns of ruby red, sapphire blue, and emerald green across the marble floor. The cathedral's ribbed vaults stretch impossibly high, adorned with Renaissance frescoes of cherubs and celestial bodies. Incense smoke curls in volumetric shafts of light. The god wears flowing robes of deep indigo and burnished gold. Surrounding the throne, classical Greek columns are entwined with ivy and golden filigree. The entire scene is framed by an ornate tapestry-worthy border of gothic arches, acanthus leaves, and celestial medallions. Bold saturated jewel-tone colors throughout. Dramatic Rembrandt lighting with rich shadows and luminous highlights. Designed for large format printing with museum-quality detail and depth. Classical oil painting style with hyperdetailed architectural elements.`,
  },
  {
    slug: "jestermaxx-supreme",
    name: "Jestermaxx Supreme",
    prompt: `An absurdist wall tapestry composition in the style of a medieval illuminated manuscript crossed with Hieronymus Bosch, depicting a muscular medieval court jester performing an overhead press with an impossibly ornate barbell made of golden cathedral spires and jeweled orbs. The jester wears a magnificent motley costume of checkered crimson and royal purple with oversized golden bells on every point. Behind the figure, a grand cathedral interior with flying buttresses serves as the gymnasium, with stained glass windows depicting scenes of physical training. Gargoyles along the walls spot the jester with tiny stone hands. A choir of monks in the background chants encouragement from illuminated songbooks. Scattered across the cathedral floor, dumbbells shaped like medieval maces and protein chalices filled with glowing emerald elixir. The color palette features rich medieval pigments: vermillion, ultramarine blue, gold leaf, forest green, and deep burgundy. An ornate decorative border of intertwined jesters, barbells, and medieval vine scrollwork frames the entire scene. Designed for large format printing with obsessive detail in every corner. Northern Renaissance painting style with absurdist humor and meticulous craftsmanship.`,
  },
  {
    slug: "skibidi-dimension",
    name: "Skibidi Dimension",
    prompt: `A fever dream wall tapestry composition in the unmistakable surrealist style of Hieronymus Bosch's Garden of Earthly Delights, depicting a vast psychedelic hellscape where organic porcelain bathroom fixtures grow from the earth like alien flora. Bizarre humanoid figures with plumbing fixtures for heads march in ceremonial procession across a landscape of melting checkerboard floors and impossible Escher-like architecture. Giant golden faucets pour rivers of iridescent liquid that flow upward into a sky swirling with fractal patterns in electric magenta, acid green, deep violet, and molten orange. Mushroom-like structures with ceramic glazed caps tower over the scene, their stems made of twisted chrome pipes. In the center, a massive ornate fountain shaped like a spiral shell radiates concentric rings of psychedelic energy. Floating geometric crystals and impossible objects dot the sky. The entire scene vibrates with maximalist detail and saturated color. Framed by an ornate border of Art Nouveau organic curves intertwined with surrealist plumbing motifs and jeweled beetles. Designed for large format printing with hallucinatory detail that rewards close inspection. Surrealist oil painting style with Bosch-level density and psychedelic color theory.`,
  },
  {
    slug: "lone-wolf-protocol",
    name: "Lone Wolf Protocol",
    prompt: `A dramatic wall tapestry composition in the style of the Hudson River School crossed with Romantic era painting, depicting a massive lone wolf standing at the edge of a towering cliff face, silhouetted against an apocalyptically beautiful sunset. The wolf's fur ripples in a cold mountain wind, every strand rendered with photorealistic detail. The sunset sky explodes with layers of molten gold, deep crimson, fiery orange, and rich violet, with dramatic crepuscular rays piercing through monumental storm clouds. Below the cliff, a vast wilderness of ancient pine forests stretches to the horizon, shrouded in atmospheric blue mist. Snow-capped mountain peaks catch the last golden light in the distance. The wolf's eyes glow with an inner amber fire, reflecting determination and solitary strength. Eagles soar in the middle distance against the dramatic sky. The foreground cliff is detailed with lichen-covered granite and wind-bent alpine vegetation. The entire composition radiates cinematic grandeur and solitary power. Framed by an ornate decorative border of interlocking Norse knotwork, pine branches, and mountain silhouettes rendered in deep charcoal and gold. Bold saturated colors optimized for large format printing. Romantic landscape painting style with hyperrealistic animal portraiture and maximum atmospheric drama.`,
  },
  {
    slug: "aura-maximizer",
    name: "Aura Maximizer",
    prompt: `A transcendent wall tapestry composition depicting an explosion of sacred geometry and mystical energy rendered in the style of Gustav Klimt crossed with Tibetan thangka painting. At the center, an elaborate golden mandala radiates outward in concentric rings of increasingly complex geometric patterns: flower of life, Metatron's cube, Sri Yantra, and Fibonacci spirals, all rendered in luminous gold leaf against a deep cosmic indigo background. Each ring of the mandala pulses with a different aura color, transitioning from brilliant white at the center through golden yellow, electric violet, royal blue, emerald green, and deep ruby red at the outer edges. Between the geometric patterns, intricate filigree of organic Art Nouveau curves flow like liquid gold. Tiny crystalline structures and sacred symbols fill every negative space. The background beyond the mandala features a deep space nebula in rich purple and midnight blue, scattered with golden star clusters. The entire composition shimmers with an inner luminosity suggesting divine radiance. Surrounded by an ornate border of repeating sacred geometry tiles in gold and lapis lazuli blue, with corner medallions featuring celestial compass roses. Designed for large format printing with fractal-level detail that reveals new patterns at every viewing distance. Bold metallic gold dominates with deep jewel-tone accents throughout. Mixed media style combining gold leaf illumination, geometric precision, and cosmic mysticism.`,
  },
];

export default TAPESTRY_PROMPTS;
