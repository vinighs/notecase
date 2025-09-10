// src/services/uiHelper.js

import { convertMarkdownToPlainText } from './textProcessor';

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime()); // Use getTime() for comparison
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (today.toDateString() === date.toDateString()) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays <= 7) {
        // For 'yesterday' or specific weekday
        if (diffDays === 1 && today.getDate() - date.getDate() === 1) return 'Yesterday';
        return date.toLocaleDateString('pt-BR', { weekday: 'long' });
    } else {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}

export function createNotePreview(content, maxLength = 80) {
  if (!content) return 'New Note';

  // Primeiro, substitui a sintaxe de imagem por um placeholder amigável.
  const contentWithoutImageSyntax = content.replace(/!\[.*?\]\(.*?\)/g, '[Image]').trim();

  // A 'content' da nota é sempre uma string Markdown.
  // Usamos nosso processador para convertê-la em texto puro de forma confiável.
  const plainText = convertMarkdownToPlainText(contentWithoutImageSyntax).trim();

  if (!plainText) {
    // Se depois de remover a sintaxe da imagem não sobrar texto,
    // significa que a nota provavelmente só continha uma imagem.
    if (content.includes('![')) return '[Image]';
    return 'Empty Note';
  }

  // Trunca o texto de forma inteligente, sem cortar palavras ao meio.
  const preview = plainText.length > maxLength
    ? plainText.substring(0, maxLength).replace(/\s+\S*$/, '...')
    : plainText;

  return preview || 'Empty Note';
}

export function debounce(func, wait) {
  let timeoutId;

  const debounced = function(...args) {
    const later = () => {
      clearTimeout(timeoutId);
      func(...args);
    };
    clearTimeout(timeoutId);
    timeoutId = setTimeout(later, wait);
  };

  debounced.cancel = () => {
    clearTimeout(timeoutId);
  };

  return debounced;
}