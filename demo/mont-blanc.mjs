/**
 * Altitude du Mont Blanc avec @glandais/elevation@latest, importé par le réseau.
 *
 * Usage :
 *   node mont-blanc.mjs
 *   deno run -A mont-blanc.mjs
 *   bun mont-blanc.mjs
 *
 * Le build Node de la librairie importe `sharp` et `canvas`, deux modules natifs :
 * ils ne peuvent pas venir d'une URL et doivent être résolus localement (Node, Bun)
 * ou via le registre npm (Deno). Chaque runtime a donc besoin d'un traitement
 * particulier, mais la librairie elle-même vient bien du réseau, en `@latest`.
 *
 * Node : les imports réseau ont été supprimés en 22.0.0 (`--experimental-network-imports`
 *   n'existe plus). Et même en 20.x, un graphe importé en HTTPS n'avait pas le droit de
 *   résoudre les specifiers nus. On installe donc l'équivalent en espace utilisateur :
 *   un hook de chargement ESM qui va chercher les URLs https et résout les specifiers
 *   nus du module distant contre ce script (donc dans le node_modules local).
 *
 * Bun : ne sait pas importer une URL. On enregistre un plugin (`Bun.plugin`) qui prend
 *   en charge le namespace `https:` — Bun découpe le specifier en namespace + chemin —
 *   et renvoie les specifiers nus vers `Bun.resolveSync`.
 *
 * Deno : sait importer une URL, mais interdit les specifiers nus dans un module distant
 *   (« Import "sharp" not a dependency »), et n'expose pas de hook de chargement. On
 *   récupère donc la source à la main, on réécrit `sharp`/`canvas` en `npm:sharp` /
 *   `npm:canvas`, et on évalue le résultat via une data URL. Aucune installation locale
 *   n'est nécessaire : Deno télécharge les paquets npm tout seul.
 */
const REMOTE = 'https://cdn.jsdelivr.net/npm/@glandais/elevation@latest/dist/index.node.mjs';

/** Importe un module ESM distant en résolvant ses dépendances natives localement. */
async function importRemote(url) {
    if (typeof Deno !== 'undefined') return importRemoteDeno(url);
    if (typeof Bun !== 'undefined') return importRemoteBun(url);
    return importRemoteNode(url);
}

async function importRemoteNode(url) {
    const { register } = await import('node:module');
    const { pathToFileURL } = await import('node:url');

    // Les specifiers nus du module distant sont résolus comme s'ils étaient importés
    // par ce script : le node_modules local est trouvé en remontant l'arborescence.
    const hooks = `
        const LOCAL = ${JSON.stringify(import.meta.url)};

        export async function resolve(specifier, context, nextResolve) {
            if (specifier.startsWith('https://')) {
                return { url: specifier, format: 'module', shortCircuit: true };
            }
            if (context.parentURL?.startsWith('https://')) {
                if (specifier.startsWith('.') || specifier.startsWith('/')) {
                    return {
                        url: new URL(specifier, context.parentURL).href,
                        format: 'module',
                        shortCircuit: true,
                    };
                }
                return nextResolve(specifier, { ...context, parentURL: LOCAL });
            }
            return nextResolve(specifier, context);
        }

        export async function load(url, context, nextLoad) {
            if (url.startsWith('https://')) {
                return { format: 'module', source: await fetchSource(url), shortCircuit: true };
            }
            return nextLoad(url, context);
        }

        async function fetchSource(url) {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(\`HTTP \${response.status} \${response.statusText} pour \${url}\`);
            }
            return response.text();
        }
    `;

    register(`data:text/javascript,${encodeURIComponent(hooks)}`, pathToFileURL('./'));
    return import(url);
}

async function importRemoteBun(url) {
    // Bun découpe `https://host/path` en namespace `https` + chemin `//host/path`.
    Bun.plugin({
        name: 'https-loader',
        setup(build) {
            build.onResolve({ filter: /.*/, namespace: 'https' }, args => ({
                path: args.path,
                namespace: 'https',
            }));
            build.onResolve({ filter: /.*/ }, args => {
                // Imports du module distant uniquement ; le reste suit la résolution par défaut.
                if (!args.importer.startsWith('//')) return undefined;
                if (args.path.startsWith('.') || args.path.startsWith('/')) {
                    const resolved = new URL(args.path, `https:${args.importer}`);
                    return { path: resolved.href.slice('https:'.length), namespace: 'https' };
                }
                if (args.path.startsWith('node:')) return { path: args.path, external: true };
                return { path: Bun.resolveSync(args.path, import.meta.dir) };
            });
            build.onLoad({ filter: /.*/, namespace: 'https' }, async args => ({
                contents: await fetchSource(`https:${args.path}`),
                loader: 'js',
            }));
        },
    });
    return import(url);
}

async function importRemoteDeno(url) {
    const source = await fetchSource(url);
    // Réécrit les specifiers nus (`sharp`, `canvas`) en specifiers npm, seuls autorisés ici.
    const patched = source.replace(
        /(\bfrom\s*|\bimport\s*\(?\s*)(["'])([^"'./][^"']*)\2/g,
        (match, keyword, quote, specifier) =>
            specifier.startsWith('node:') ? match : `${keyword}${quote}npm:${specifier}${quote}`
    );
    return import(`data:text/javascript,${encodeURIComponent(patched)}`);
}

async function fetchSource(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} pour ${url}`);
    }
    return response.text();
}

const { ElevationProvider } = await importRemote(REMOTE);

const MONT_BLANC = { latitude: 45.8326, longitude: 6.8652 };

const provider = new ElevationProvider();
const elevation = await provider.getElevation(MONT_BLANC.latitude, MONT_BLANC.longitude);

console.log(`Mont Blanc (${MONT_BLANC.latitude}, ${MONT_BLANC.longitude}) : ${elevation} m`);
console.log(provider.getAttribution().text);
