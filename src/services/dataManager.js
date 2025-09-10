import fs from 'fs';
import path from 'path';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { createEditor, $getRoot, $createParagraphNode } from 'lexical';
import { generateRandomKey } from '@lexical/utils';

export function importMarkdownFile(filePath) {
  const markdownText = fs.readFileSync(filePath, 'utf-8');

  const editor = createEditor();
  let json;

  editor.update(() => {
    const root = $getRoot();
    root.clear(); // Limpa conteúdo existente
    $convertFromMarkdownString(markdownText, null);
    json = editor.getEditorState().toJSON();
  });

  return json; // Esse JSON pode ser usado para setar o conteúdo da nota
}

export function exportNoteToMarkdown(lexicalJson, outputPath) {
  const editor = createEditor();
  const editorState = editor.parseEditorState(lexicalJson);
  let markdown = '';

  editor.setEditorState(editorState);

  editor.update(() => {
    markdown = $convertToMarkdownString();
  });

  fs.writeFileSync(outputPath, markdown);
}

