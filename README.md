# Conversor de Imagens (HTML + CSS + JS)

Este é um projeto simples e 100% client-side (roda direto no navegador) que permite converter qualquer imagem para diferentes formatos suportados pelo seu navegador (PNG, JPEG, WebP, AVIF etc).

## Funcionalidades
- Upload ou arrastar-e-soltar imagens.
- Pré-visualização antes da conversão.
- Conversão para diferentes formatos de imagem.
- Ajuste de qualidade (para formatos com compressão com perdas: JPEG, WebP, AVIF).
- Download imediato do arquivo convertido.
- Tudo acontece localmente — nenhum arquivo é enviado para servidores externos.

## Suporte de formatos
O suporte depende do navegador. Normalmente:
- PNG
- JPEG/JPG
- WebP
- AVIF (navegadores modernos)
- GIF animado → apenas o primeiro quadro.
- SVG → convertido para bitmap (PNG).
- HEIC/HEIF → pode não ser suportado nativamente.

## Limitações
- Metadados EXIF (como localização, autor, câmera) não são preservados.
- GIFs animados perdem a animação (mantém apenas o primeiro frame).
- SVGs são rasterizados no tamanho exibido.

## Tecnologias utilizadas
- HTML5 → Estrutura do app.
- CSS3 → Estilização responsiva e clean.
- JavaScript (ES6+) → Manipulação de imagens via `<canvas>`.

