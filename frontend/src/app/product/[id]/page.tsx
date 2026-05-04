"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Zap, Tag, Heart, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

function ProductContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const isPreview = searchParams.get('preview') === 'true';
    const id = params?.id ? String(params.id) : "";

    const { user } = useAuth();
    const { addToCart } = useCart();
    const router = useRouter();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const [product, setProduct] = useState<any>(null);
    const [similarProducts, setSimilarProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial image selection
    const [selectedImage, setSelectedImage] = useState<string>("");

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products/${id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        console.error(data.error);
                    } else {
                        setProduct(data);

                        // Set initial selected image
                        const imgs = Array.isArray(data.images) && data.images.length > 0 ? data.images : [data.image];
                        setSelectedImage(imgs[0]);

                        // Fetch similar (same category) ONLY IF NOT PREVIEW
                        if (!isPreview) {
                            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products?category=${data.category}`)
                                .then(res => res.json())
                                .then(sim => {
                                    if (Array.isArray(sim)) {
                                        setSimilarProducts(sim.filter((p: any) => p.id !== id).slice(0, 4));
                                    } else {
                                        setSimilarProducts([]);
                                    }
                                })
                                .catch(err => console.error(err));
                        }
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [id, isPreview]);

    if (loading) return <div className="p-20 text-center">Loading product...</div>;
    if (!product) return <div className="p-20 text-center">Product not found.</div>;

    // Normalizing image to array if string
    // Prioritize 'images' array if exists, else fallback to 'image'
    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image];

    return (
        <div className="w-full px-1 py-4 bg-[#F5EFE6] mt-2">
            <div className="flex flex-col md:flex-row gap-8">

                {/* Left: Images */}
                <div className="md:w-[40%] flex gap-4 sticky top-24 h-fit">
                    <div className="flex flex-col gap-2">
                        {images.map((img: string, i: number) => (
                            <div
                                key={i}
                                className={`w-16 h-16 border rounded p-1 cursor-pointer hover:border-[#0B3D2E] relative bg-white ${selectedImage === img ? 'border-[#0B3D2E] border-2 shadow-sm' : 'border-gray-200'}`}
                                onMouseEnter={() => setSelectedImage(img)}
                            >
                                <img src={img.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${img}` : img} 
                                     alt="Thumbnail" 
                                     className="w-full h-full object-contain" />
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 relative border border-gray-200 rounded-2xl p-4 h-[495px] overflow-hidden bg-white shadow-sm flex items-center justify-center">
                        <img src={(selectedImage || images[0]).startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${selectedImage || images[0]}` : (selectedImage || images[0])} 
                             alt="Product" 
                             className="max-w-full max-h-full object-contain" />

                        {/* Wishlist Button - Hidden in Preview */}
                        {!isPreview && (
                            <div
                                className="absolute top-2 right-2 p-2 rounded-full shadow bg-white border border-gray-100 transition-shadow hover:shadow-md z-10 cursor-pointer"
                                onClick={async () => {
                                    if (user) {
                                        if (isInWishlist(product.id)) {
                                            await removeFromWishlist(product.id);
                                        } else {
                                            await addToWishlist({ ...product, image: images[0] });
                                        }
                                    } else {
                                        router.push("/login");
                                    }
                                }}
                            >
                                <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'fill-transparent text-gray-400 hover:text-red-500'}`} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Details */}
                <div className="flex-1">
                    <p className="text-[12px] text-gray-500 mb-2">Home &gt; {product.category} &gt; {product.brand}</p>

                    <h1 className="text-[18px] font-normal text-gray-900 mb-2">{product.title}</h1>

                    {product.brand && (
                        <p className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-4">{product.brand}</p>
                    )}

                    {/* Price Section */}
                    <div className="mb-4">
                        <div className="text-green-600 text-sm font-bold mb-1">Special Price</div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-[28px] font-semibold text-black">
                                <span className="text-sm text-gray-500 font-normal mr-1">Rate:</span>
                                ₹{product.price.toLocaleString()}
                            </span>
                            {product.originalPrice && Number(product.originalPrice) > product.price && (
                                <span className="text-[16px] text-gray-500 line-through">
                                    <span className="text-sm mr-1">M.R.P.:</span>
                                    ₹{Number(product.originalPrice).toLocaleString()}
                                </span>
                            )}
                            {(product.discount > 0 || (product.originalPrice && Number(product.originalPrice) > product.price)) && (
                                <span className="text-[16px] text-[#0B3D2E] font-medium">
                                    {product.discount > 0
                                        ? product.discount
                                        : Math.round(((Number(product.originalPrice) - product.price) / Number(product.originalPrice)) * 100)
                                    }% off
                                </span>
                            )}
                        </div>
                    </div>


                    {/* Actions - Hidden in Preview */}
                    {!isPreview && (
                        <div className="flex gap-4 my-8">
                            {product.countInStock > 0 ? (
                                <>
                                    <button
                                        onClick={() => {
                                            if (user) {
                                                addToCart({ ...product, image: images[0] });
                                            } else {
                                                window.location.href = "/login";
                                            }
                                        }}
                                        className="flex-1 bg-[#F59E0B] text-white font-medium py-3.5 shadow px-2 uppercase text-[15px] flex items-center justify-center gap-2 hover:shadow-lg transition-shadow rounded-lg"
                                    >
                                        <ShoppingCart className="w-5 h-5 fill-white" />
                                        Add to Cart
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (user) {
                                                router.push(`/checkout?buyNow=true&productId=${product.id}`);
                                            } else {
                                                window.location.href = "/login";
                                            }
                                        }}
                                        className="flex-1 bg-[#F59E0B] text-white font-medium py-3.5 shadow px-2 uppercase text-[15px] flex items-center justify-center gap-2 hover:shadow-lg transition-shadow rounded-lg"
                                    >
                                        <Zap className="w-5 h-5 fill-white" />
                                        Buy Now
                                    </button>
                                </>
                            ) : (
                                <button
                                    disabled
                                    className="flex-1 bg-red-500 text-white font-medium py-3.5 shadow px-2 uppercase text-[15px] flex items-center justify-center gap-2 cursor-not-allowed opacity-90"
                                >
                                    Out of Stock
                                </button>
                            )}
                        </div>
                    )}

                    {isPreview && (
                        <div className="my-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                            <p><strong>Preview Mode:</strong> Cart, Wishlist, Buying options, and Similar Products are hidden.</p>
                        </div>
                    )}

                    <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-2">Description</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
                    </div>

                </div>
            </div>

            {/* Similar Products - Hidden in Preview */}
            {similarProducts.length > 0 && !isPreview && (
                <div className="mt-12 border-t pt-8">
                    <h2 className="text-[20px] font-semibold mb-6">Similar Products</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {similarProducts.map((p) => (
                            <ProductCard key={p.id} {...p} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProductDetailPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Loading product...</div>}>
            <ProductContent />
        </Suspense>
    );
}
