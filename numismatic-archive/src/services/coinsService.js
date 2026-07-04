const BASE = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api`;

// ─── GET /api/coins ────────────────────────────────────────────────────────────
// Devuelve todas las monedas guardadas en coins.json
export async function fetchCoins() {
  const res = await fetch(`${BASE}/coins`);
  if (!res.ok) throw new Error('Error al cargar el inventario.');
  return res.json();
}

// ─── POST /api/images/upload ───────────────────────────────────────────────────
// Sube un File o Blob al backend y devuelve { url: "/api/images/coins/xxx.jpg" }
// Uso: const { url } = await uploadCoinImage(file);
export async function uploadCoinImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${BASE}/images/upload`, {
    method: 'POST',
    body: formData,   // NO pongas Content-Type: el browser lo setea solo con boundary
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al subir la imagen.');
  }
  return res.json(); // { url }
}

// ─── POST /api/coins ───────────────────────────────────────────────────────────
// Crea una moneda nueva. imageUrl es la URL devuelta por uploadCoinImage (opcional).
export async function createCoin({ name, year, mint, grade, estimatedValue, status, description, imageUrl }) {
  const res = await fetch(`${BASE}/coins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, year, mint, grade, estimatedValue, status, description, imageUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar la moneda.');
  }
  return res.json(); // devuelve la moneda creada con su id
}

// ─── PUT /api/coins/:id ────────────────────────────────────────────────────────
// Actualiza los datos de una moneda existente.
export async function updateCoin(id, fields) {
  const res = await fetch(`${BASE}/coins/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar la moneda.');
  }
  return res.json();
}

// ─── DELETE /api/coins/:id ─────────────────────────────────────────────────────
// Elimina la moneda y su imagen del disco.
export async function deleteCoin(id) {
  const res = await fetch(`${BASE}/coins/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al eliminar la moneda.');
  }
  return res.json();
}

// ─── SALES API ─────────────────────────────────────────────────────────────────

export async function fetchSales() {
  const res = await fetch(`${BASE}/sales`);
  if (!res.ok) throw new Error('Error al cargar ventas.');
  return res.json();
}

export async function createSaleAPI({ coinId, coinName, buyer, salePrice, date, status, paymentMethod, notes }) {
  const res = await fetch(`${BASE}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coinId, coinName, buyer, salePrice, date, status, paymentMethod, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar venta.');
  }
  return res.json();
}

export async function updateSaleAPI(id, fields) {
  const res = await fetch(`${BASE}/sales/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar venta.');
  }
  return res.json();
}

export async function deleteSaleAPI(id) {
  const res = await fetch(`${BASE}/sales/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al eliminar venta.');
  }
  return res.json();
}

// ─── AUCTIONS API ───────────────────────────────────────────────
export async function fetchAuctions() {
  const res = await fetch(`${BASE}/auctions`);
  if (!res.ok) throw new Error('Error al cargar subastas.');
  return res.json();
}

export async function createAuctionAPI(data) {
  const res = await fetch(`${BASE}/auctions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar subasta.');
  }
  return res.json();
}

export async function updateAuctionAPI(id, fields) {
  const res = await fetch(`${BASE}/auctions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar subasta.');
  }
  return res.json();
}

// POST /api/auctions/:id/bids — el servidor valida monto y estado del lote
export async function placeBidAPI(lotId, amount, bidder) {
  const res = await fetch(`${BASE}/auctions/${lotId}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, bidder }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar la puja.');
  }
  return res.json(); // lote actualizado con historial de pujas
}

export async function fetchActivity() {
  const res = await fetch(`${BASE}/activity`);
  if (!res.ok) throw new Error('Error al cargar actividad.');
  return res.json();
}

// ─── POSTS API ──────────────────────────────────────────────────────────
export async function fetchPosts() {
  const res = await fetch(`${BASE}/posts`);
  if (!res.ok) throw new Error('Error al cargar publicaciones.');
  return res.json();
}

export async function createPostAPI({ author, body, imageUrl, tags }) {
  const res = await fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, body, imageUrl, tags }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al publicar.');
  }
  return res.json();
}

export async function updatePostAPI(id, fields) {
  const res = await fetch(`${BASE}/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error('Error al actualizar publicación.');
  return res.json();
}

export async function uploadPostImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${BASE}/images/upload/posts`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al subir imagen.');
  }
  return res.json(); // { url: '/api/images/posts/posts-xxxx.jpg' }
}

export async function addCommentAPI(postId, { author, text }) {
  const res = await fetch(`${BASE}/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al comentar.');
  }
  return res.json();
}

export async function fetchSummary() {
  const res = await fetch(`${BASE}/summary`);
  if (!res.ok) throw new Error('Error al cargar resumen.');
  return res.json();
}

// ─── CERTIFICATIONS API ─────────────────────────────────────────────────
export async function fetchCertifications() {
  const res = await fetch(`${BASE}/certifications`);
  if (!res.ok) throw new Error('Error al cargar certificaciones.');
  return res.json();
}

export async function createCertificationAPI(data) {
  const res = await fetch(`${BASE}/certifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar certificación.');
  }
  return res.json();
}

export async function updateCertificationAPI(id, fields) {
  const res = await fetch(`${BASE}/certifications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar certificación.');
  }
  return res.json();
}

// ─── CONVERSATIONS API ──────────────────────────────────────────────────
export async function fetchConversations() {
  const res = await fetch(`${BASE}/conversations`);
  if (!res.ok) throw new Error('Error al cargar conversaciones.');
  return res.json();
}

export async function sendMessageAPI(conversationId, text, attachment = null) {
  const body = { text };
  if (attachment) {
    body.attachmentUrl = attachment.url;
    body.attachmentType = attachment.type; // 'image' | 'audio'
  }
  const res = await fetch(`${BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al enviar el mensaje.');
  }
  return res.json();
}

// ─── Subida genérica de imagen/audio para mensajes ──────────────────────
export async function uploadMessageAttachment(file) {
  const formData = new FormData();
  formData.append('image', file); // el backend espera el campo 'image' aunque sea audio

  const res = await fetch(`${BASE}/images/upload/messages`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al subir el archivo.');
  }
  return res.json(); // { url, mimetype }
}

export async function deleteMessageAPI(conversationId, messageId) {
  const res = await fetch(`${BASE}/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al eliminar el mensaje.');
  }
  return res.json();
}