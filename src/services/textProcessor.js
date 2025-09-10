import { createEditor, $getRoot } from 'lexical';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS as COMMON_MARKDOWN_TRANSFORMERS,
} from '@lexical/markdown';
import { CHECK_LIST } from '@lexical/markdown';
import { IMAGE_TRANSFORMER } from './ImageTransformer.js'; // Nome atualizado

// Importe TODOS os tipos de nó que seu editor principal usa
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ImageNode } from '../components/editor/nodes/ImageNode.jsx';

const NODES_FOR_PROCESSING = [
  HeadingNode, QuoteNode,
  ListNode, ListItemNode,
  CodeNode, CodeHighlightNode,
  TableNode, TableCellNode, TableRowNode,
  LinkNode, AutoLinkNode,
  ImageNode
];

// CORREÇÃO IMPORTANTE: O transformer de imagem deve vir PRIMEIRO para ter prioridade
// O transformer de checklist precisa vir ANTES dos transformers de lista comuns
const ALL_TRANSFORMERS = [IMAGE_TRANSFORMER, CHECK_LIST, ...COMMON_MARKDOWN_TRANSFORMERS];

const headlessEditorConfig = {
  namespace: 'headlessTextProcessor',
  nodes: NODES_FOR_PROCESSING,
  onError: (error) => {
    console.error('Headless Lexical processing error:', error);
  },
};

// Renomeado de extractTagsFromText para consistência com o App.jsx
export const extractTagsFromString = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }
  const regex = /#([a-zA-ZÀ-ÖØ-öø-ÿ0-9_-]+)/g;
  const matches = text.match(regex) || [];
  const uniqueTags = new Set(matches.map(tag => tag.substring(1).toLowerCase()));
  return Array.from(uniqueTags).sort();
};

/**
 * Extrai automaticamente um título do conteúdo da nota
 * @param {string} content - O conteúdo markdown da nota
 * @param {number} maxLength - Número máximo de caracteres para o título (padrão: 80)
 * @returns {string} - O título extraído ou uma string vazia
 */
export const extractTitleFromContent = (content, maxLength = 80) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove o markdown do início (headers, listas, etc.) para pegar texto limpo
  let cleanContent = content
    // Remove headers markdown (# ## ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove marcadores de lista (- * +)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove numeração de listas (1. 2. etc)
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove checkboxes (- [ ] - [x])
    .replace(/^[\s]*[-*+]\s*\[[x\s]\]\s*/gmi, '')
    // Remove código inline (`código`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove negrito e itálico (**texto** *texto*)
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    // CORREÇÃO: Remove completamente a sintaxe de imagem, em vez de deixar o alt text.
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // Remove quebras de linha múltiplas
    .replace(/\n+/g, ' ')
    // Remove espaços múltiplos
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanContent) {
    return '';
  }

  // Pega a primeira linha significativa
  const firstLine = cleanContent.split('\n')[0] || cleanContent;
  
  // Limita ao número máximo de caracteres
  const title = firstLine.length > maxLength 
    ? firstLine.substring(0, maxLength).trim() + '...'
    : firstLine.trim();

  return title;
};

/**
 * Converte uma string Markdown para o estado JSON do Lexical.
 * @param {string} markdownString - O conteúdo em Markdown.
 * @returns {string | null} O estado do editor Lexical como string JSON, ou nulo em caso de erro.
 */
export const convertMarkdownToLexical = (markdownString) => {


  if (markdownString === null || typeof markdownString === 'undefined') {
    return null;
  }
  
  try {
    const editor = createEditor(headlessEditorConfig);
    
    editor.update(() => {
      $convertFromMarkdownString(markdownString, ALL_TRANSFORMERS);
    }, { discrete: true });

    const lexicalJSON = editor.getEditorState().toJSON();
    
    // Debug melhorado
    const jsonString = JSON.stringify(lexicalJSON);
    if (jsonString.includes('"type":"image"')) {
      console.log('[textProcessor.js] ✅ Sucesso: Markdown convertido para nó de imagem Lexical.', {
        markdownInput: markdownString.substring(0, 200),
        imageNodes: JSON.stringify(lexicalJSON).match(/"type":"image"[^}]+}/g)
      });
    }

    return JSON.stringify(lexicalJSON);
  } catch (error) {
    console.error('Failed to convert Markdown to Lexical:', error);
    return null;
  }
};

/**
 * Converte o estado JSON do Lexical para uma string Markdown.
 * @param {string} lexicalJSONString - O estado do editor Lexical como string JSON.
 * @returns {string | null} String Markdown, ou nulo em caso de erro.
 */
export const convertLexicalToMarkdown = (lexicalJSONString) => {
  if (!lexicalJSONString || typeof lexicalJSONString !== 'string') {
    return '';
  }

  try {
    const editor = createEditor(headlessEditorConfig);
    const editorState = editor.parseEditorState(lexicalJSONString);
    editor.setEditorState(editorState);

    let markdownString = '';
    
    // CORREÇÃO CRÍTICA: Usar o método síncrono read() em vez do update()
    editorState.read(() => {
      markdownString = $convertToMarkdownString(ALL_TRANSFORMERS);
    });

    // Debug melhorado
    if (lexicalJSONString.includes('"type":"image"')) {
      if (markdownString.includes('![')) {
        console.log('[textProcessor.js] ✅ Sucesso: Estado Lexical convertido para Markdown com imagem:', {
          outputMarkdown: markdownString,
          imageMatches: markdownString.match(/!\[[^\]]*\]\([^)]+\)/g)
        });
      } else {
        console.error('[textProcessor.js] ❌ ERRO: Estado Lexical contém imagem mas Markdown não foi gerado corretamente:', {
          lexicalInput: lexicalJSONString.substring(0, 500),
          markdownOutput: markdownString
        });
      }
    }

    return markdownString;
  } catch (error) {
    console.error('Failed to convert Lexical to Markdown:', error);
    return null;
  }
};

/**
 * Converte uma string Markdown para texto puro, removendo toda a formatação.
 * @param {string} markdownString - O conteúdo em Markdown.
 * @returns {string} O texto puro.
 */
export const convertMarkdownToPlainText = (markdownString) => {
  if (!markdownString || typeof markdownString !== 'string') {
    return '';
  }
  try {
    const editor = createEditor(headlessEditorConfig);
    // O editor precisa ser atualizado dentro de um callback `update`
    editor.update(() => {
      $convertFromMarkdownString(markdownString, ALL_TRANSFORMERS);
    }, { discrete: true }); // `discrete: true` para execuções síncronas

    // O estado precisa ser lido dentro de um callback `read`
    return editor.getEditorState().read(() => {
      return $getRoot().getTextContent();
    });
  } catch (error) {
    console.error('Failed to convert Markdown to plain text:', error);
    return markdownString; // Retorna o markdown original como fallback
  }
};