const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const readline = require('readline');

// Função para perguntar ao usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

// --- Script Principal de Migração ---

async function migrate() {
  console.log('--- Anota Data Migration Script ---');

  // 1. Obter o caminho do arquivo de armazenamento antigo
  const oldStoragePath = await askQuestion('Enter the path to your old storage.json file: ');
  if (!await fs.access(oldStoragePath).then(() => true).catch(() => false)) {
    console.error('Error: Old storage file not found at the specified path.');
    rl.close();
    return;
  }

  // 2. Obter o caminho para o novo vault
  const vaultPath = await askQuestion('Enter the path for your new vault directory (it will be created if it doesn\'t exist): ');
  if (!vaultPath) {
      console.error('Error: Vault path cannot be empty.');
      rl.close();
      return;
  }

  try {
    // 3. Ler os dados antigos
    console.log('\nReading old data...');
    const oldData = JSON.parse(await fs.readFile(oldStoragePath, 'utf-8'));
    const notes = oldData.notes || [];
    const folders = oldData.folders || [];

    // 4. Criar o diretório do vault e subpastas
    console.log('Creating vault structure...');
    await fs.mkdir(vaultPath, { recursive: true });
    await fs.mkdir(path.join(vaultPath, 'trash'), { recursive: true });

    for (const folder of folders) {
        if (!folder.system) { // Não cria 'all' ou 'trash' como pastas físicas inicialmente
            const folderPath = path.join(vaultPath, folder.id);
            console.log(`Creating folder: ${folderPath}`)
            await fs.mkdir(folderPath, { recursive: true });
        }
    }

    // 5. Migrar cada nota
    console.log('\nMigrating notes...');
    for (const note of notes) {
      const folderId = note.folderId === 'all' ? '' : note.folderId;
      const notePathDir = path.join(vaultPath, folderId);
      const noteFilePath = path.join(notePathDir, `${note.id}.md`);

      const yamlData = {
        id: note.id,
        title: note.title || 'Untitled Note',
        tags: note.tags || [],
        createdAt: note.createdAt,
        modifiedAt: note.modifiedAt,
        previousFolderId: note.previousFolderId,
      };

      const content = `---\n${yaml.dump(yamlData)}---\n${note.content || ''}`;

      // Garante que o diretório de destino exista
      await fs.mkdir(notePathDir, { recursive: true });
      await fs.writeFile(noteFilePath, content, 'utf-8');
      console.log(`  - Migrated note ${note.id} to ${noteFilePath}`);
    }

    console.log('\n--- Migration Complete! ---');
    console.log(`Your new vault is ready at: ${vaultPath}`);
    console.log('You can now run the application and select this vault.');

  } catch (error) {
    console.error('\nAn error occurred during migration:', error);
  } finally {
    rl.close();
  }
}

migrate();
