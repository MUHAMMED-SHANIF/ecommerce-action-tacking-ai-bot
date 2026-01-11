"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CategoryBar from "@/components/CategoryBar";
import RecentlyVisited from "@/components/home/RecentlyVisited";
import RecommendedProducts from "@/components/home/RecommendedProducts";
import DynamicSection from "@/components/home/DynamicSection";

interface Product {
  id: string;
  title: string;
  image: string;
  rating: number;
  numReviews: number;
  price: number;
  originalPrice: number;
  discount: number;
  offer?: string;
  countInStock?: number;
  category?: string;
}

interface Banner {
  id: string;
  image: string;
  actionType: string;
  targetId: string;
}

interface BannerConfig {
  autoPlay: boolean;
  showCarousel: boolean;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>({ autoPlay: true, showCarousel: true });
  const [homeSections, setHomeSections] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Products
        const pRes = await fetch("http://localhost:5001/api/products");
        const pData = await pRes.json();
        setProducts(pData);

        // Fetch Banners
        const bRes = await fetch("http://localhost:5001/api/banners");
        const bData = await bRes.json();
        setBanners(bData.banners || []);
        if (bData.config) setBannerConfig(bData.config);

        // Fetch Home Layout
        const lRes = await fetch("http://localhost:5001/api/home-layout");
        const lData = await lRes.json();
        if (lData.sections) setHomeSections(lData.sections);

      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchData();
  }, []);

  // Carousel Logic
  useEffect(() => {
    if (bannerConfig.autoPlay && banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [bannerConfig.autoPlay, banners.length]);

  const handleBannerClick = (b: Banner) => {
    if (b.actionType === 'product' && b.targetId) {
      router.push(`/product/${b.targetId}`);
    } else if (b.actionType === 'category' && b.targetId) {
      router.push(`/search?category=${encodeURIComponent(b.targetId)}`);
    }
  };

  const nextBanner = () => setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);

  const getImageUrl = (img: string) => {
    if (!img) return '';
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return `http://localhost:5001${img}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f1f2f4]">
      {/* Category Bar Section */}
      <CategoryBar />

      {/* Banner Section - Full Width, Outside Container */}
      {banners.length > 0 ? (
        <div className="w-full bg-white shadow-sm hover:shadow-md transition-shadow mb-4 mt-2">
          <div className="relative w-full h-[180px] sm:h-[240px] md:h-[320px] lg:h-[380px]">
            {bannerConfig.showCarousel ? (
              <>
                {banners.map((b, index) => (
                  <div
                    key={b.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    onClick={() => handleBannerClick(b)}
                  >
                    <img
                      src={getImageUrl(b.image)}
                      alt="Banner"
                      className="w-full h-full object-fill"
                    />
                  </div>
                ))}

                {banners.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevBanner(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 p-2 rounded-full hover:bg-white z-20 shadow-md">
                      <ChevronLeft size={24} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextBanner(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 p-2 rounded-full hover:bg-white z-20 shadow-md">
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCurrentBannerIndex(i); }}
                      className={`h-2 rounded-full transition-all shadow-sm ${i === currentBannerIndex ? 'bg-white w-6' : 'bg-white/60 w-2'}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div
                className="w-full h-full cursor-pointer"
                onClick={() => handleBannerClick(banners[0])}
              >
                <img
                  src={getImageUrl(banners[0].image)}
                  alt="Banner"
                  className="w-full h-full object-fill"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-4"></div> /* Spacer if no banner */
      )}

      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-4 max-w-[1400px]">

        {/* 1. Recently Visited */}
        <RecentlyVisited />

        {/* 2. Recommended For You */}
        <RecommendedProducts />

        {/* 3. Custom Dynamic Sections */}
        {homeSections.map((sec) => (
          <DynamicSection key={sec.id} title={sec.title} category={sec.category} />
        ))}

        {/* Fallback / Default Section if needed ? User said "adjust what type of items need to show... currently we are showing best electronics here we need to show firstly recently visited..."
            I will keep the default product grid at the bottom as "All Products" or "Just For You" generic mix if desired, but user focused on replacing/adjusting.
            I'll keep the existing grid as a generic "Browse All" for now to ensure page isn't empty if no history.
        */}
        <h2 className="text-xl font-bold mb-4">More to Explore</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
          {products.length === 0 && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center bg-white rounded shadow-sm text-gray-500">
              <p className="text-lg font-medium">Loading products...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
