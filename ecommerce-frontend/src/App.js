import React, { useState, useEffect } from 'react';
import './App.css';

const API = 'https://shophub-c29t.onrender.com';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [page, setPage] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminTab, setAdminTab] = useState('orders');
  const [pendingProducts, setPendingProducts] = useState([]);
  const [sifarishForm, setSifarishForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mehsulForm, setMehsulForm] = useState(false);
  const [yeniMehsul, setYeniMehsul] = useState({
    name: '', description: '', price: '', stock: '', image_url: '', category_id: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (token) fetchCart();
  }, [token]);

  async function fetchProducts(s = search, catId = selectedCategory) {
    let url = `${API}/products?`;
    if (s) url += `search=${s}&`;
    if (catId) url += `category_id=${catId}`;
    const res = await fetch(url);
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  }

  async function fetchCategories() {
    const res = await fetch(`${API}/categories`);
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  }

  async function fetchCart() {
    const res = await fetch(`${API}/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) { logout(); return; }
    const data = await res.json();
    setCart(Array.isArray(data) ? data : []);
  }

  async function login(email, password) {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setPage('products');
    } else {
      alert('Invalid email or password!');
    }
  }

  async function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setCart([]);
    setPage('products');
  }

  async function addToCart(productId) {
    if (!token) { setPage('login'); return; }
    const res = await fetch(`${API}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId, quantity: 1 })
    });
    if (res.status === 401 || res.status === 403) { logout(); return; }
    fetchCart();
    alert('Added to cart! 🛒');
  }

  async function removeFromCart(itemId) {
    await fetch(`${API}/cart/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchCart();
  }

  async function updateQuantity(itemId, newQty) {
    if (newQty <= 0) { await removeFromCart(itemId); return; }
    await fetch(`${API}/cart/${itemId}?quantity=${newQty}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchCart();
  }

  async function placeOrder() {
    if (!fullName || !phone || !address) {
      alert('Please fill all fields!');
      return;
    }
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ full_name: fullName, phone, address })
    });
    const data = await res.json();
    if (data.id) {
      alert('Order placed successfully! 🎉');
      setSifarishForm(false);
      setFullName(''); setPhone(''); setAddress('');
      fetchCart();
    } else {
      alert('Something went wrong!');
    }
  }

  async function fetchAdminOrders() {
    setAdminOrders([]);
    const res = await fetch(`${API}/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setAdminOrders(Array.isArray(data) ? data : []);
    setAdminTab('orders');
    setPage('admin');
  }

  async function fetchAdminUsers() {
    const res = await fetch(`${API}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setAdminUsers(Array.isArray(data) ? data : []);
    setAdminTab('users');
    setPage('admin');
  }

  async function changeRole(userId) {
    await fetch(`${API}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchAdminUsers();
  }

  async function changeStatus(orderId, newStatus) {
    await fetch(`${API}/admin/orders/${orderId}/status?status=${newStatus}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchAdminOrders();
  }

  async function fetchPendingProducts() {
    const res = await fetch(`${API}/admin/pending-products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setPendingProducts(Array.isArray(data) ? data : []);
    setAdminTab('pending');
    setPage('admin');
  }

  async function approveProduct(productId) {
    await fetch(`${API}/admin/products/${productId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchPendingProducts();
  }

  async function deleteProductAdmin(productId) {
    await fetch(`${API}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchPendingProducts();
  }

  async function register(name, email, password) {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.id) {
      alert('Registration successful! Please login.');
      setPage('login');
    } else {
      alert('Error! This email is already registered.');
    }
  }

  async function addProduct() {
    if (!yeniMehsul.name || !yeniMehsul.price) {
      alert('Name and price are required!');
      return;
    }
    const res = await fetch(`${API}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...yeniMehsul,
        price: parseFloat(yeniMehsul.price),
        stock: parseInt(yeniMehsul.stock) || 0,
        category_id: yeniMehsul.category_id ? parseInt(yeniMehsul.category_id) : null
      })
    });
    const data = await res.json();
    if (data.id) {
      alert('Product submitted! Waiting for admin approval. ✅');
      setMehsulForm(false);
      setYeniMehsul({ name: '', description: '', price: '', stock: '', image_url: '', category_id: '' });
    }
  }

  function tokenRole() {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])).role;
    } catch {
      return null;
    }
  }

  function selectCategory(catId) {
    setSelectedCategory(catId);
    fetchProducts(search, catId);
  }

  return (
    <div className="app">
      <header>
        <h1 onClick={() => setPage('products')} style={{cursor:'pointer'}}>🛍️ ShopHub</h1>
        <div className="search-bar">
          <input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchProducts()}
          />
          <button onClick={() => fetchProducts()}>🔍</button>
        </div>
        <nav>
          <button onClick={() => setPage('products')}>Products</button>
          {token && <button onClick={() => setPage('cart')}>🛒 ({cart.length})</button>}
          {token && <button onClick={() => setMehsulForm(true)}>➕ Sell</button>}
          {token && ['admin', 'superadmin'].includes(tokenRole()) && (
            <button onClick={fetchAdminOrders}>⚙️ Admin</button>
          )}
          {token ? <button onClick={logout}>Logout</button> : <button onClick={() => setPage('login')}>Login</button>}
          {!token && <button onClick={() => setPage('register')}>Register</button>}
        </nav>
      </header>

      {page === 'products' && (
        <div className="main">
          <div className="sidebar">
            <h3>Categories</h3>
            <button className={!selectedCategory ? 'active' : ''} onClick={() => selectCategory(null)}>🏪 All</button>
            {categories.map(c => (
              <button key={c.id} className={selectedCategory === c.id ? 'active' : ''} onClick={() => selectCategory(c.id)}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <div className="products">
            {products.length === 0 ? <p>No products found</p> : products.map(p => (
              <div className="card" key={p.id} onClick={() => setSelectedProduct(p)}>
                {p.image_url && <img src={p.image_url} alt={p.name} />}
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <strong>{p.price} $</strong>
                <span className="stock">Stock: {p.stock}</span>
                <button onClick={e => { e.stopPropagation(); addToCart(p.id); }}>🛒 Add to Cart</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
            {selectedProduct.image_url && (
              <img src={selectedProduct.image_url} alt={selectedProduct.name} />
            )}
            <div className="modal-info">
              <h2>{selectedProduct.name}</h2>
              <p>{selectedProduct.description}</p>
              <strong>{selectedProduct.price} $</strong>
              <span>Stock: {selectedProduct.stock}</span>
              <button onClick={() => { addToCart(selectedProduct.id); setSelectedProduct(null); }}>
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {page === 'cart' && (
        <div className="cart">
          <h2>🛒 My Cart</h2>
          {cart.length === 0 ? <p>Your cart is empty</p> : (
            <>
              {cart.map(item => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-info">
                    {item.product_image && <img src={item.product_image} alt={item.product_name} />}
                    <div>
                      <strong>{item.product_name}</strong>
                      <span>{item.price} $</span>
                    </div>
                  </div>
                  <div className="cart-item-actions">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    <button className="delete-btn" onClick={() => removeFromCart(item.id)}>🗑️</button>
                  </div>
                  <div className="cart-item-total">
                    {(item.price * item.quantity).toFixed(2)} $
                  </div>
                </div>
              ))}
              <div className="cart-total">
                <strong>Total: {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)} $</strong>
              </div>
              {!sifarishForm ? (
                <button className="order-btn" onClick={() => setSifarishForm(true)}>Place Order</button>
              ) : (
                <div className="order-form">
                  <h3>Delivery Information</h3>
                  <input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
                  <input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
                  <input placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} />
                  <button className="order-btn" onClick={placeOrder}>Confirm Order</button>
                  <button className="cancel-btn" onClick={() => setSifarishForm(false)}>Cancel</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {page === 'admin' && (
        <div className="admin">
          <h2>⚙️ Admin Panel</h2>
          <div className="admin-tabs">
            <button onClick={fetchAdminOrders}>📦 Orders</button>
            <button onClick={fetchAdminUsers}>👥 Users</button>
            <button onClick={fetchPendingProducts}>⏳ Pending Products</button>
          </div>

          {adminTab === 'orders' && (
            <>
              <h3>All Orders</h3>
              {adminOrders.length === 0 ? <p>No orders yet</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Customer</th><th>Full Name</th><th>Address</th><th>Products</th><th>Total</th><th>Status</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminOrders.map(s => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{s.user}<br/><small>{s.email}</small></td>
                        <td>{s.full_name}<br/><small>{s.phone}</small></td>
                        <td>{s.address}</td>
                        <td>
                          {s.items && s.items.map((item, i) => (
                            <div key={i} className="order-item-row">
                              {item.product_image && <img src={item.product_image} alt={item.product_name} />}
                              <span>{item.product_name} x{item.quantity} — {item.price}$</span>
                            </div>
                          ))}
                        </td>
                        <td>{s.total_price} $</td>
                        <td>
                          <select
                            value={s.status}
                            onChange={e => changeStatus(s.id, e.target.value)}
                            className={`status-select ${s.status}`}
                          >
                            <option value="gözlənilir">🕐 Pending</option>
                            <option value="hazırlanır">📦 Processing</option>
                            <option value="yoldadır">🚚 Shipped</option>
                            <option value="çatdırıldı">✅ Delivered</option>
                          </select>
                        </td>
                        <td>{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {adminTab === 'users' && (
            <>
              <h3>All Users</h3>
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {adminUsers.map(u => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role === 'superadmin' ? '⭐ Superadmin' : u.role === 'admin' ? '👑 Admin' : '👤 Customer'}</td>
                      <td>
                        {u.role !== 'superadmin' && (
                          <button onClick={() => changeRole(u.id)}>
                            {u.role === 'admin' ? 'Make Customer' : 'Make Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {adminTab === 'pending' && (
            <>
              <h3>⏳ Pending Products</h3>
              {pendingProducts.length === 0 ? <p>No pending products</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>Image</th><th>Name</th><th>Seller</th><th>Price</th><th>Stock</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProducts.map(p => (
                      <tr key={p.id}>
                        <td>{p.image_url && <img src={p.image_url} alt={p.name} style={{width:'50px',height:'50px',objectFit:'cover',borderRadius:'5px'}} />}</td>
                        <td><strong>{p.name}</strong><br/><small>{p.description}</small></td>
                        <td>{p.seller}</td>
                        <td>{p.price} $</td>
                        <td>{p.stock}</td>
                        <td>
                          <button onClick={() => approveProduct(p.id)} style={{background:'#00b894',marginRight:'5px'}}>✅ Approve</button>
                          <button onClick={() => deleteProductAdmin(p.id)} style={{background:'#e94560'}}>❌ Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {mehsulForm && (
        <div className="modal-overlay" onClick={() => setMehsulForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setMehsulForm(false)}>✕</button>
            <div className="modal-info">
              <h2>➕ Sell a Product</h2>
              <input placeholder="Product Name *" value={yeniMehsul.name} onChange={e => setYeniMehsul({...yeniMehsul, name: e.target.value})} />
              <input placeholder="Description" value={yeniMehsul.description} onChange={e => setYeniMehsul({...yeniMehsul, description: e.target.value})} />
              <input placeholder="Price *" type="number" value={yeniMehsul.price} onChange={e => setYeniMehsul({...yeniMehsul, price: e.target.value})} />
              <input placeholder="Stock" type="number" value={yeniMehsul.stock} onChange={e => setYeniMehsul({...yeniMehsul, stock: e.target.value})} />
              <input placeholder="Image URL" value={yeniMehsul.image_url} onChange={e => setYeniMehsul({...yeniMehsul, image_url: e.target.value})} />
              <select value={yeniMehsul.category_id} onChange={e => setYeniMehsul({...yeniMehsul, category_id: e.target.value})}>
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <button onClick={addProduct}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {page === 'login' && <LoginForm onLogin={login} onRegister={() => setPage('register')} />}
      {page === 'register' && <RegisterForm onRegister={register} onLogin={() => setPage('login')} />}
    </div>
  );
}

function LoginForm({ onLogin, onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="login">
      <h2>Login</h2>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={() => onLogin(email, password)}>Login</button>
      <p>Don't have an account? <span onClick={onRegister}>Register</span></p>
    </div>
  );
}

function RegisterForm({ onRegister, onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="login">
      <h2>Register</h2>
      <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={() => onRegister(name, email, password)}>Register</button>
      <p>Already have an account? <span onClick={onLogin}>Login</span></p>
    </div>
  );
}

export default App;