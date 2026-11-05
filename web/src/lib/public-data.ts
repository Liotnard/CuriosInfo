let release: Promise<string> | undefined;
async function version() {
  release ??= fetch("/data/manifest.json", { cache: "no-store" }).then(async response => {
    if (!response.ok) throw new Error("Les données ne sont pas encore publiées.");
    const manifest = await response.json();
    if (!/^[0-9a-f-]{36}$/.test(manifest.version)) throw new Error("Publication invalide");
    return manifest.version as string;
  }).catch(error => { release = undefined; throw error; });
  return release;
}
export async function publicData<T>(file:string):Promise<T> {
  const response = await fetch(`/data/releases/${await version()}/${file}`);
  if (!response.ok) throw new Error(response.status === 404 ? "Sujet introuvable" : "Chargement impossible");
  return response.json();
}
