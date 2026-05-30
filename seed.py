import requests

BASE = "http://localhost:8000"

# Login
res = requests.post(f"{BASE}/login", json={"email": "nicat@mail.com", "password": "1234"})
token = res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# Categories from fakestoreapi
fakestore_cats = requests.get("https://fakestoreapi.com/products/categories").json()

cat_ids = {}
category_icons = {
    "electronics": "📱",
    "jewelery": "💍",
    "men's clothing": "👔",
    "women's clothing": "👗"
}

for cat in fakestore_cats:
    res = requests.post(f"{BASE}/categories", json={
        "name": cat.title(),
        "icon": category_icons.get(cat, "🛍️")
    }, headers=headers)
    cat_ids[cat] = res.json()["id"]
    print(f"✅ Category: {cat}")

# Products from fakestoreapi
products = requests.get("https://fakestoreapi.com/products").json()

for p in products:
    cat_name = p["category"]
    requests.post(f"{BASE}/products", json={
        "name": p["title"][:200],
        "description": p["description"][:1000],
        "price": p["price"],
        "stock": 50,
        "image_url": p["image"],
        "category_id": cat_ids.get(cat_name)
    }, headers=headers)
    print(f"✅ Product: {p['title'][:50]}")

print("\n🎉 All data imported!")