import { DecoratorNode } from 'lexical';
import React, { Suspense } from 'react';

const ImageComponent = React.lazy(() => import('./ImageComponent'));

function convertImageElement(domNode) {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src, width, height } = domNode;
    const node = $createImageNode({ src, altText, width, height });
    return { node };
  }
  return null;
}

export class ImageNode extends DecoratorNode {
  __src;
  __altText;
  __width;
  __height;

  static getType() {
    return 'image';
  }

  static clone(node) {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key,
    );
  }

  static importJSON(serializedNode) {
    const { src, altText, width, height } = serializedNode;
    const node = $createImageNode({
      src,
      altText,
      width,
      height,
    });
    return node;
  }

  exportJSON() {
    return {
      altText: this.getAltText(),
      height: this.__height,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width,
    };
  }

  exportDOM() {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText || '');
    if (this.__width) element.setAttribute('width', this.__width);
    if (this.__height) element.setAttribute('height', this.__height);
    return { element };
  }

  constructor(src, altText, width, height, key) {
    super(key);
    this.__src = src || '';
    this.__altText = altText || '';
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    
    // Debug para verificar criação do nó
    console.log('[ImageNode.jsx] Criando nó de imagem:', { src, altText, width, height });
  }

  static importDOM() {
    return {
      img: (domNode) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  importDOM() {
    return ImageNode.importDOM();
  }

  createDOM(config) {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    span.style.display = 'inline-block';
    return span;
  }

  updateDOM() {
    return false;
  }

  getSrc() {
    return this.__src;
  }

  getAltText() {
    return this.__altText;
  }

  getWidth() {
    return this.__width;
  }

  getHeight() {
    return this.__height;
  }

  setSrc(src) {
    const writable = this.getWritable();
    writable.__src = src;
  }

  setAltText(altText) {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  // Método crítico para identificação do nó pelos transformers
  getTextContent() {
    return `![${this.__altText || ''}](${this.__src || ''})`;
  }

  decorate() {
    return (
      <Suspense fallback={<div className="editor-image-loading">Loading image...</div>}>
        <ImageComponent
          src={this.__src}
          altText={this.__altText}
          width={this.__width}
          height={this.__height}
          nodeKey={this.getKey()}
        />
      </Suspense>
    );
  }
}

export function $createImageNode({ altText = '', height = 'inherit', src = '', width = 'inherit', key }) {
  return new ImageNode(src, altText, width, height, key);
}

export function $isImageNode(node) {
  return node instanceof ImageNode;
}