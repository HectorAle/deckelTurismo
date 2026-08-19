#!/usr/bin/env python3
"""Genera las páginas del sitio a partir de _fuente/.

Ensambla cada página combinando los parciales comunes (cabecera, pie, botón
flotante) con el contenido propio de cada página y cada idioma. Así un cambio
en la cabecera o el pie se aplica a todas las páginas de los dos idiomas.

Uso:
    python3 construir.py            genera todo
    python3 construir.py --check    no escribe; informa si algo quedó desfasado

Los archivos generados en la raíz y en en/ NO deben editarse a mano: este
script los sobrescribe. El contenido se edita en _fuente/.
"""
import json, pathlib, re, sys

RAIZ = pathlib.Path(__file__).parent
SRC  = RAIZ / "_fuente"
CFG  = json.loads((SRC / "sitio.json").read_text())

AVISO = ("<!-- ARCHIVO GENERADO POR construir.py — NO EDITAR A MANO.\n"
         "     El contenido se edita en _fuente/paginas/{idioma}/{pagina}/\n"
         "     La cabecera y el pie, en _fuente/parciales/ -->\n")


def parcial(nombre):
    return (SRC / "parciales" / f"{nombre}.html").read_text().rstrip("\n")


def rellenar(txt, datos):
    """Sustituye {{CLAVE}} por su valor."""
    def rep(m):
        clave = m.group(1)
        if clave not in datos:
            return m.group(0)      # no es una variable nuestra: se deja igual
        return str(datos[clave])
    return re.sub(r"\{\{(\w+)\}\}", rep, txt)


TEXTOS = {i: json.loads((SRC / "textos" / f"{i}.json").read_text()) for i in CFG["idiomas"]}
BASE = "https://deckelturismo.cl"


def urls_idioma(slug):
    """URL de esta página en cada idioma, para el selector y los hreflang."""
    return {i: TEXTOS[i][f"url_{slug}"] for i in CFG["idiomas"]}


def alternativas(slug, idioma):
    """Etiquetas hreflang: cada idioma apunta a su equivalente, más x-default."""
    u = urls_idioma(slug)
    filas = [f'  <link rel="alternate" hreflang="{i}" href="{BASE}{u[i]}" />'
             for i in CFG["idiomas"]]
    filas.append(f'  <link rel="alternate" hreflang="x-default" href="{BASE}{u["es"]}" />')
    return "\n".join(filas)


def _texto(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html)).strip()


def faq_desde_contenido(contenido, seo, idioma):
    """Reescribe el FAQPage del JSON-LD con el texto visible de la página.

    Google exige que los datos estructurados coincidan con lo que ve el usuario.
    Generarlos desde el marcado evita que se separen al editar uno de los dos.
    """
    pares = list(zip(re.findall(r'faq-q">(.*?)<i', contenido, re.S),
                     re.findall(r'faq-a">(.*?)</div>', contenido, re.S)))
    if not pares:
        return seo

    m = re.search(r'(<script type="application/ld\+json">)(.*?)(</script>)', seo, re.S)
    if not m:
        return seo
    try:
        datos = json.loads(m.group(2))
    except json.JSONDecodeError:
        return seo

    grafo = datos.get("@graph", [datos])
    for nodo in grafo:
        if nodo.get("@type") != "FAQPage":
            continue
        nodo["inLanguage"] = idioma
        nodo["mainEntity"] = [
            {"@type": "Question", "name": _texto(q),
             "acceptedAnswer": {"@type": "Answer", "text": _texto(a)}}
            for q, a in pares
        ]
    nuevo = json.dumps(datos, indent=2, ensure_ascii=False)
    nuevo = "\n".join(("  " + l if l.strip() else l) for l in nuevo.split("\n"))
    return seo[:m.start(2)] + "\n" + nuevo + "\n  " + seo[m.end(2):]


def armar(idioma, slug, datos):
    d = SRC / "paginas" / idioma / slug
    if not d.is_dir():
        return None

    u = urls_idioma(slug)
    ctx = dict(TEXTOS[idioma])
    ctx.update({
        "SUBSITIO": datos["subsitio"],
        "MENSAJE_WA": datos.get(f"mensaje_wa_{idioma}", datos["mensaje_wa"]),
        "URL_ES": u["es"], "URL_EN": u["en"],
        "ACTIVO_ES": ' aria-current="true"' if idioma == "es" else "",
        "ACTIVO_EN": ' aria-current="true"' if idioma == "en" else "",
    })

    estilo = (d / "estilo.css").read_text().rstrip("\n")
    partes = [
        "<!DOCTYPE html>",
        f'<html lang="{idioma}" data-subsitio="{datos["subsitio"]}">',
        "<head>",
        AVISO.rstrip("\n"),
        faq_desde_contenido((d / "contenido.html").read_text(),
                            (d / "seo.html").read_text().rstrip("\n"), idioma),
        alternativas(slug, idioma),
        parcial("head-comun"),
        "  <style>",
        estilo,
        "  </style>",
        "</head>",
        "<body>",
        rellenar(parcial("header"), ctx),
        "",
        rellenar((d / "contenido.html").read_text().rstrip("\n"), ctx),
        "",
        rellenar(parcial("footer"), ctx),
        "",
        rellenar(parcial("wa-float"), ctx),
        "",
        '  <script src="/js/main.js"></script>',
        '  <script src="/js/analytics.js" defer></script>',
        "</body>",
        "</html>",
        "",
    ]
    return "\n".join(partes)


def destino(idioma, slug, datos):
    if idioma == "es":
        return RAIZ / datos["archivo_es"]
    return RAIZ / "en" / datos.get("archivo_en", f"{slug}.html")


def main():
    solo_check = "--check" in sys.argv
    generadas = desfasadas = 0

    for slug, datos in CFG["paginas"].items():
        for idioma in CFG["idiomas"]:
            html = armar(idioma, slug, datos)
            if html is None:
                continue
            ruta = destino(idioma, slug, datos)
            actual = ruta.read_text() if ruta.exists() else None
            if actual == html:
                generadas += 1
                continue
            desfasadas += 1
            if solo_check:
                print(f"  DESFASADA  {ruta.relative_to(RAIZ)}")
            else:
                ruta.parent.mkdir(parents=True, exist_ok=True)
                ruta.write_text(html)
                print(f"  escrita    {ruta.relative_to(RAIZ)}")

    if solo_check:
        print(f"\n{generadas} al día · {desfasadas} desfasadas")
        sys.exit(1 if desfasadas else 0)
    print(f"\n{generadas + desfasadas} páginas generadas")


if __name__ == "__main__":
    main()
