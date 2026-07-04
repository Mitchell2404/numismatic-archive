import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DATA_PATH  = join(__dirname, '../data/conversations.json');

function readConvs() {
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); }
  catch { return []; }
}
function writeConvs(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/conversations
export function getConversations(req, res) {
  try {
    const convs = readConvs();
    // Las más recientes primero
    convs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(convs);
  } catch { res.status(500).json({ error: 'Error al leer conversaciones.' }); }
}

// POST /api/conversations/:id/messages
export function sendMessage(req, res) {
  try {
    const convs = readConvs();
    const idx = convs.findIndex(c => String(c.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Conversación no encontrada.' });

    const { text, attachmentUrl, attachmentType } = req.body;
    const hasText = text && text.trim();
    const hasAttachment = attachmentUrl && attachmentType;

    if (!hasText && !hasAttachment) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    }

    const now = new Date();
    const newMessage = {
      id: Date.now(),
      type: 'sent',
      text: hasText ? text.trim() : '',
      time: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }),
    };

    // attachmentType: 'image' | 'audio'
    if (hasAttachment) {
      newMessage.attachment = { url: attachmentUrl, type: attachmentType };
    }

    convs[idx].messages.push(newMessage);
    convs[idx].updatedAt = now.toISOString();
    writeConvs(convs);

    res.status(201).json(convs[idx]);
  } catch { res.status(500).json({ error: 'Error al enviar el mensaje.' }); }
}

// DELETE /api/conversations/:id/messages/:messageId
export function deleteMessage(req, res) {
  try {
    const convs = readConvs();
    const idx = convs.findIndex(c => String(c.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Conversación no encontrada.' });

    const msgIdx = convs[idx].messages.findIndex(m => String(m.id) === String(req.params.messageId));
    if (msgIdx === -1) return res.status(404).json({ error: 'Mensaje no encontrado.' });

    const msg = convs[idx].messages[msgIdx];

    // Solo se pueden eliminar mensajes propios (sent), no recibidos
    if (msg.type !== 'sent') {
      return res.status(403).json({ error: 'Solo puedes eliminar tus propios mensajes.' });
    }

    convs[idx].messages.splice(msgIdx, 1);
    writeConvs(convs);

    res.json(convs[idx]);
  } catch { res.status(500).json({ error: 'Error al eliminar el mensaje.' }); }
}