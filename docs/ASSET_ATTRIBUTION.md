# Asset attribution

MirrorMoment includes no third-party garment photography, retailer imagery,
campaign material, logos, or screenshots. The apparel references below were
created specifically for this project with OpenAI's built-in image-generation
tool on 2026-08-07. No external reference image was supplied.

| Catalog file | Original subject | Source / creator | Attribution in product or video |
| --- | --- | --- | --- |
| `navy-tailoring.jpg` | Navy tailored blazer and trousers | Project-created with OpenAI image generation | Not required |
| `ivory-jumpsuit.jpg` | Ivory tailored jumpsuit | Project-created with OpenAI image generation | Not required |
| `plum-wrap-dress.jpg` | Plum wrap dress | Project-created with OpenAI image generation | Not required |
| `graphite-set.jpg` | Graphite blazer and wide-leg trousers | Project-created with OpenAI image generation | Not required |
| `sage-midi.jpg` | Sage tailored midi dress | Project-created with OpenAI image generation | Not required |
| `cocoa-blazer-set.jpg` | Cocoa relaxed blazer and trousers | Project-created with OpenAI image generation | Not required |
| `blue-satin-set.jpg` | Midnight-blue satin wrap set | Project-created with OpenAI image generation | Not required |
| `linen-layered-look.jpg` | Natural-linen layered three-piece look | Project-created with OpenAI image generation | Not required |
| `black-evening-look.jpg` | Black long-sleeve evening dress | Project-created with OpenAI image generation | Not required |

## Generation prompt record

Each asset used a separate `product-mockup` prompt describing its catalog
subject. The shared constraints requested one original, unbranded, front-facing
complete garment on an invisible dress form, photographed against a clean
warm-white studio background with no person, body parts, accessories, text,
logo, trademark, watermark, visible mannequin, hanger, or extra object.

Do not replace these files with retailer product photos, campaign imagery,
logos, or screenshots without documenting permission here.

The canonical application JPEGs in `public/catalog/` are metadata-stripped,
size-optimized derivatives. Their original generated PNG files remain tracked
under `assets/catalog-source/` for provenance and reproducibility.

## Recorded judge replay

The replay uses only synthetic, project-created material. No real shopper photo
or third-party campaign image is included.

| Replay file | Source / creator | Purpose |
| --- | --- | --- |
| `synthetic-face.jpg` | Project-created with OpenAI image generation on 2026-08-13 from the synthetic body identity; metadata-stripped derivative | Input used for the successful matched-subject Skin Analysis run (`radiance: 85`) |
| `synthetic-body.jpg` | Project-created with OpenAI image generation on 2026-08-07; metadata-stripped derivative | Input used for the successful Clothes V3 run |
| `navy-tailoring-result.jpg` | YouCam Clothes V3 output captured on 2026-08-07 from the synthetic subject and original project garment | Recorded judge result |
| `cocoa-blazer-set-result.jpg` | YouCam Clothes V3 output captured on 2026-08-07 from the synthetic subject and original project garment | Recorded judge result |
| `graphite-set-result.jpg` | YouCam Clothes V3 output captured on 2026-08-07 from the synthetic subject and original project garment | Recorded judge result |

The three output images are disclosed in the product as recorded evidence. They
must not be described as fresh API results when replay mode is running.
