"use client";

import { useEffect, useState, useMemo } from "react";
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
  duration?: number;
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
        const pRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products`, { cache: 'no-store' });
        if (pRes.ok) {
          const pData = await pRes.json();
          setProducts(Array.isArray(pData) ? pData : []);
        } else {
          console.error("Failed to fetch products:", pRes.status);
          setProducts([]);
        }

        // Fetch Banners
        const bRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/banners`, { cache: "no-store" });
        if (bRes.ok) {
          const bData = await bRes.json();
          setBanners(bData.banners || []);
          if (bData.config) setBannerConfig(bData.config);
        }

        // Fetch Home Layout
        const lRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/home-layout`);
        if (lRes.ok) {
          const lData = await lRes.json();
          if (lData.sections) setHomeSections(lData.sections);
        }

      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchData();
  }, []);

  // Pad banners to ensure we have at least 3 for the carousel layout
  const displayBanners = useMemo(() => {
    let padded = [...banners];
    if (padded.length === 1) {
      padded.push({ id: 'placeholder-1', image: '', actionType: '', targetId: '' });
      padded.push({ id: 'placeholder-2', image: '', actionType: '', targetId: '' });
    } else if (padded.length === 2) {
      padded.push({ id: 'placeholder-2', image: '', actionType: '', targetId: '' });
    }
    return padded;
  }, [banners]);

  // Carousel Logic
  useEffect(() => {
    if (bannerConfig.autoPlay && displayBanners.length > 1) {
      const currentBanner = displayBanners[currentBannerIndex] || displayBanners[0];
      const duration = (currentBanner?.duration || 5) * 1000; // Convert to ms

      const timer = setTimeout(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % displayBanners.length);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [bannerConfig.autoPlay, displayBanners.length, currentBannerIndex, displayBanners]);

  const handleBannerClick = (b: Banner) => {
    if (!b.image) return; // Prevent click on placeholders
    if (b.actionType === 'product' && b.targetId) {
      router.push(`/product/${b.targetId}`);
    } else if (b.actionType === 'category' && b.targetId) {
      router.push(`/search?category=${encodeURIComponent(b.targetId)}`);
    }
  };

  const nextBanner = () => setCurrentBannerIndex((prev) => (prev + 1) % displayBanners.length);
  const prevBanner = () => setCurrentBannerIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);

  const getImageUrl = (img: string) => {
    if (!img) return '';
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${img}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f1f2f4]">
      {/* Category Bar Section */}
      <CategoryBar />

      {/* Banner Section - Center Mode Carousel */}
      {banners.length > 0 ? (
        <div className="w-full bg-[#f1f2f4] overflow-hidden mb-6 mt-4">
          <div className="relative w-full h-[160px] sm:h-[220px] md:h-[280px] lg:h-[340px] flex justify-center items-center">
            {bannerConfig.showCarousel ? (
              <>
                {displayBanners.map((b, index) => {
                  let positionClass = 'translate-x-0 scale-50 opacity-0 z-0 pointer-events-none hidden';
                  
                  if (displayBanners.length >= 3) {
                    if (index === currentBannerIndex) {
                      positionClass = 'translate-x-0 scale-100 opacity-100 z-20 shadow-xl';
                    } else if (index === (currentBannerIndex + 1) % displayBanners.length) {
                      positionClass = 'translate-x-[96%] sm:translate-x-[96%] md:translate-x-[98%] lg:translate-x-[102%] scale-[0.9] opacity-70 z-10 cursor-pointer';
                    } else if (index === (currentBannerIndex - 1 + displayBanners.length) % displayBanners.length) {
                      positionClass = '-translate-x-[96%] sm:-translate-x-[96%] md:-translate-x-[98%] lg:-translate-x-[102%] scale-[0.9] opacity-70 z-10 cursor-pointer';
                    }
                  } else {
                    if (index === currentBannerIndex) positionClass = 'translate-x-0 scale-100 opacity-100 z-20 shadow-xl';
                  }

                  return (
                    <div
                      key={`${b.id}-${index}`}
                      className={`absolute w-[90%] sm:w-[80%] md:w-[75%] lg:w-[65%] max-w-[1000px] h-full transition-all duration-[800ms] ease-[cubic-bezier(0.25,0.8,0.25,1)] rounded-2xl overflow-hidden flex items-center justify-center bg-white ${positionClass}`}
                      onClick={() => {
                        if (index === currentBannerIndex) {
                          handleBannerClick(b);
                        } else {
                          setCurrentBannerIndex(index);
                        }
                      }}
                    >
                      {b.image ? (
                        <img
                          src={getImageUrl(b.image)}
                          alt="Banner"
                          className="w-full h-full object-fill md:object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white"></div>
                      )}
                    </div>
                  );
                })}

                {displayBanners.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevBanner(); }} className="absolute left-2 sm:left-6 md:left-10 lg:left-16 top-1/2 -translate-y-1/2 bg-white/80 p-2 sm:p-3 rounded-full hover:bg-white z-30 shadow-lg transition-transform hover:scale-110">
                      <ChevronLeft size={24} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextBanner(); }} className="absolute right-2 sm:right-6 md:right-10 lg:right-16 top-1/2 -translate-y-1/2 bg-white/80 p-2 sm:p-3 rounded-full hover:bg-white z-30 shadow-lg transition-transform hover:scale-110">
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                  {displayBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCurrentBannerIndex(i); }}
                      className={`h-2 rounded-full transition-all shadow-sm ${i === currentBannerIndex ? 'bg-blue-600 w-8' : 'bg-white/80 w-2 hover:bg-white'}`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div
                className="w-[90%] sm:w-[80%] md:w-[75%] lg:w-[65%] max-w-[1000px] h-full rounded-2xl overflow-hidden cursor-pointer shadow-xl"
                onClick={() => handleBannerClick(banners[0])}
              >
                <img
                  src={getImageUrl(banners[0].image)}
                  alt="Banner"
                  className="w-full h-full object-fill md:object-cover"
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
          sec && sec.id ? <DynamicSection key={sec.id} title={sec.title || 'Untitled'} category={sec.category || ''} /> : null
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
