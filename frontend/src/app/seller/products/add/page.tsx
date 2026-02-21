'use client';

import ProductForm from "@/components/admin/ProductForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AddProduct() {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <Link href="/seller/products" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Products
            </Link>

            <div className="">
                {/* ProductForm handles everything, including "Add New Product" title if we didn't pass it, 
                    but here we wrap it to match layout or just let it be. 
                    ProductForm has its own container styling (bg-white, shadow, etc).
                    Let's just render it. */}
                <ProductForm />
            </div>
        </div>
    );
}
