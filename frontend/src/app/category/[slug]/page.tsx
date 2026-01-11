import ProductCard from "@/components/ProductCard";
import SidebarFilter from "@/components/SidebarFilter";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const categoryName = decodeURIComponent(slug);

    let products = [];
    try {
        const res = await fetch(`http://localhost:5001/api/products?category=${encodeURIComponent(categoryName)}`, {
            cache: 'no-store' // Ensure fresh data
        });
        if (res.ok) {
            products = await res.json();
        }
    } catch (err) {
        console.error("Failed to fetch products for category:", categoryName, err);
    }

    return (
        <div className="container mx-auto px-2 py-3 bg-[#f1f2f4] max-w-[1248px]">
            {/* Breadcrumb - Basic */}
            <div className="text-[12px] text-gray-500 mb-3 ml-2">
                Home &gt; Categories &gt; <span className="capitalize">{categoryName}</span>
            </div>

            <div className="flex">
                <SidebarFilter />

                <div className="flex-1 bg-white shadow-sm rounded-sm">
                    <div className="p-4 border-b border-gray-100 flex flex-col gap-2">
                        <h1 className="text-[18px] font-medium text-black capitalize">
                            {categoryName}
                            <span className="text-[12px] text-gray-500 ml-2">(Showing 1 – {products.length} products of {products.length})</span>
                        </h1>
                        <div className="flex items-center gap-4 text-[14px]">
                            <span className="font-medium text-black">Sort By</span>
                            <span className="text-[#22c55e] font-medium border-b-2 border-[#22c55e] cursor-pointer pb-0.5">Popularity</span>
                            <span className="cursor-pointer hover:text-blue-500">Price -- Low to High</span>
                            <span className="cursor-pointer hover:text-blue-500">Price -- High to Low</span>
                            <span className="cursor-pointer hover:text-blue-500">Newest First</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 divide-x divide-y divide-gray-100 min-h-[400px]">
                        {products.length > 0 ? (
                            products.map((product: any) => (
                                <div key={product.id} className="hover:shadow-lg transition-shadow bg-white p-2">
                                    <ProductCard {...product} />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center text-gray-500 h-64">
                                <p className="text-lg font-medium">No products found in this category.</p>
                                <p className="text-sm">Try checking other categories.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
