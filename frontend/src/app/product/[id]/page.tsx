"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart, Zap, Tag, Heart } from "lucide-react";
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
            fetch(`http://localhost:5001/api/products/${id}`)
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
                            fetch(`http://localhost:5001/api/products?category=${data.category}`)
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
        <div className="w-full px-1 py-4 bg-white mt-2">
            <div className="flex flex-col md:flex-row gap-8">

                {/* Left: Images */}
                <div className="md:w-[40%] flex gap-4 sticky top-24 h-fit">
                    <div className="flex flex-col gap-2">
                        {images.map((img: string, i: number) => (
                            <div
                                key={i}
                                className={`w-16 h-16 border rounded p-1 cursor-pointer hover:border-blue-500 relative ${selectedImage === img ? 'border-blue-500' : ''}`}
                                onMouseEnter={() => setSelectedImage(img)}
                            >
                                <Image src={img} alt="Thumbnail" fill className="object-contain" />
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 relative border rounded-sm p-4 h-[450px]">
                        <Image src={selectedImage || images[0]} alt="Product" fill className="object-contain" priority />

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

                    <div className="flex items-center gap-4 mb-4">
                        <span className="bg-[#388e3c] text-white text-[12px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            {product.rating} <Star className="w-3 h-3 fill-white" />
                        </span>
                        <span className="text-gray-500 text-[13px] font-medium">{product.reviews?.toLocaleString()} Ratings & Reviews</span>
                        <Image src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/fa_62673a.png" alt="Assured" width={77} height={21} />
                    </div>

                    <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-[28px] font-semibold text-black">₹{product.price.toLocaleString()}</span>
                        {product.originalPrice && <span className="text-[16px] text-gray-500 line-through">₹{Number(product.originalPrice).toLocaleString()}</span>}
                        {product.discount > 0 && <span className="text-[16px] text-[#388e3c] font-medium">{product.discount}% off</span>}
                    </div>

                    {/* Offers - Hide in Preview if desired, or keep as info? Prompt said "dont need add to cart, buy now, wish list options and also dont need to the similiar product". Offers are info, so I'll keep them but hide actions. */}
                    <div className="mb-6">
                        <h3 className="text-[14px] font-medium mb-2">Available offers</h3>
                        <ul className="flex flex-col gap-2">
                            <li className="flex items-start gap-2 text-[14px] text-gray-700">
                                <Tag className="w-4 h-4 text-[#388e3c] mt-0.5 flex-shrink-0" />
                                <span>Bank Offer 5% Unlimited Cashback on Flipkart Axis Bank Credit Card</span>
                            </li>
                            <li className="flex items-start gap-2 text-[14px] text-gray-700">
                                <Tag className="w-4 h-4 text-[#388e3c] mt-0.5 flex-shrink-0" />
                                <span>Special Price Get extra discount</span>
                            </li>
                        </ul>
                    </div>

                    {/* Actions - Hidden in Preview */}
                    {!isPreview && (
                        <div className="flex gap-4 my-8">
                            <button
                                onClick={() => {
                                    if (user) {
                                        addToCart({ ...product, image: images[0] });
                                    } else {
                                        window.location.href = "/login";
                                    }
                                }}
                                className="flex-1 bg-[#ff9f00] text-white font-medium py-3.5 shadow px-2 uppercase text-[15px] flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
                            >
                                <ShoppingCart className="w-5 h-5 fill-white" />
                                Add to Cart
                            </button>
                            <button className="flex-1 bg-[#fb641b] text-white font-medium py-3.5 shadow px-2 uppercase text-[15px] flex items-center justify-center gap-2 hover:shadow-lg transition-shadow">
                                <Zap className="w-5 h-5 fill-white" />
                                Buy Now
                            </button>
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
