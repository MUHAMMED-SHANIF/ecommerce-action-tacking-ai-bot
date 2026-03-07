-- Run this in your Supabase SQL Editor to temporarily allow anonymous inserts during migration:
CREATE POLICY "Temporarily allow anon inserts during migration" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Temporarily allow anon inserts during migration" ON banners FOR INSERT WITH CHECK (true);
CREATE POLICY "Temporarily allow anon inserts during migration" ON home_layout FOR INSERT WITH CHECK (true);
CREATE POLICY "Temporarily allow anon inserts during migration" ON categories FOR INSERT WITH CHECK (true);
