-- PostgreSQL DDL Script for StyleVerse AI Products Table and Initial Data

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price VARCHAR(50) NOT NULL,
    original_price VARCHAR(50),
    rating DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    image VARCHAR(500) NOT NULL,
    store VARCHAR(100) NOT NULL,
    colors JSON NOT NULL DEFAULT '[]'::json,
    sizes JSON NOT NULL DEFAULT '[]'::json
);

CREATE INDEX IF NOT EXISTS ix_products_id ON products (id);
CREATE INDEX IF NOT EXISTS ix_products_name ON products (name);
CREATE INDEX IF NOT EXISTS ix_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS ix_products_category ON products (category);

-- Insert initial StyleVerse products
INSERT INTO products (id, name, brand, category, price, original_price, rating, image, store, colors, sizes)
VALUES
    (1, 'Oversized Graphic Hoodie', 'H&M', 'Hoodies', '₹1,299', '₹2,499', 4.5, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80', 'H&M', '["Black", "Gray", "Cream"]'::json, '["S", "M", "L", "XL"]'::json),
    (2, 'Classic White Sneakers', 'Nike', 'Sneakers', '₹4,999', '₹6,999', 4.8, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', 'Nike', '["White", "Off White", "Black"]'::json, '["6", "7", "8", "9", "10"]'::json),
    (3, 'Korean Streetwear Jacket', 'Zara', 'Jackets', '₹3,499', '₹5,999', 4.3, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80', 'Zara', '["Olive", "Black", "Stone"]'::json, '["S", "M", "L", "XL"]'::json),
    (4, 'Minimalist Watch', 'Daniel Wellington', 'Accessories', '₹8,999', '₹12,999', 4.7, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80', 'Daniel Wellington', '["Silver", "Black", "Gold"]'::json, '["One Size"]'::json),
    (5, 'Slim Fit Chinos', 'Uniqlo', 'Pants', '₹1,999', '₹3,499', 4.4, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80', 'Uniqlo', '["Sand", "Navy", "Charcoal"]'::json, '["S", "M", "L", "XL"]'::json),
    (6, 'Leather Crossbody Bag', 'Fossil', 'Bags', '₹5,499', '₹7,999', 4.6, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80', 'Fossil', '["Tan", "Black", "Espresso"]'::json, '["One Size"]'::json)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence value if needed
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
