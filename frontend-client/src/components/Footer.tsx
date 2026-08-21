function Footer() {
    return <footer className="mt-16 bg-neutral-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-3">
            <section>
                <h2 className="text-lg font-bold uppercase">Công ty TNHH WLSport</h2>
                <div className="mt-4 h-1 w-8 bg-neutral-500"/>
                <h3 className="mt-6 font-bold uppercase">Thông tin liên hệ</h3>
                <div className="mt-4 space-y-3 text-sm text-neutral-200">
                    <p>Hotline: <a href="tel:0909384088" className="hover:text-emerald-400">0909.384.088</a> – <a
                        href="tel:0899303303" className="hover:text-emerald-400">0899.303.303</a></p>
                    <p>Email: <a href="mailto:congtywlsportvn@gmail.com"
                                 className="hover:text-emerald-400">congtywlsportvn@gmail.com</a></p>
                    <p>Hợp tác kinh doanh: 0899.703.703</p>
                    <p>Hotline bán sỉ: 0899.703.703</p>
                    <p>Khiếu nại: 0899.703.703</p>
                    <p>Website: wlsport.com</p>
                </div>
            </section>
            <section>
                <h2 className="text-lg font-bold uppercase">Hệ thống cửa hàng</h2>
                <div className="mt-4 h-1 w-8 bg-neutral-500"/>
                <div className="mt-6 space-y-4 text-sm leading-6 text-neutral-200">
                    <p><strong>Chi nhánh 1:</strong><br/>85 Trần Đình Xu, P. Nguyễn Cư Trinh, Quận 1, TP.HCM.</p>
                    <p><strong>Chi nhánh 2:</strong><br/>38A Đỗ Xuân Hợp, P. Phước Long A, Quận 9, TP.HCM.</p>
                    <p><strong>Chi nhánh 3:</strong><br/>144 Tô Hiến Thành, P.15, Quận 10, TP.HCM.</p>
                    <p><strong>Chi nhánh 4:</strong><br/>972 Nguyễn Kiệm, P.3, Quận Gò Vấp, TP.HCM.</p>
                </div>
            </section>
            <section>
                <h2 className="text-lg font-bold uppercase">Thông tin hỗ trợ</h2>
                <div className="mt-4 h-1 w-8 bg-neutral-500"/>
                <nav aria-label="Thông tin hỗ trợ" className="mt-6 divide-y divide-neutral-800 text-sm">
                    <a href="#returns" className="block py-3 hover:text-emerald-400">Đổi trả và hoàn tiền</a>
                    <a href="#warranty" className="block py-3 hover:text-emerald-400">Bảo hành sản phẩm</a>
                    <a href="#terms" className="block py-3 hover:text-emerald-400">Quy định chung</a>
                    <a href="#privacy" className="block py-3 hover:text-emerald-400">Bảo mật thông tin</a>
                </nav>
                <div className="mt-6 rounded-lg bg-slate-700 p-5 text-center">
                    <p className="text-xl font-black text-yellow-300">THANH TOÁN</p>
                    <p className="font-bold text-yellow-200">THUẬN TIỆN - NHANH CHÓNG</p>
                </div>
            </section>
        </div>
        <div
            className="border-t border-neutral-800 px-4 py-4 text-center text-xs text-neutral-400">© {new Date().getFullYear()} WLSport.
            All rights reserved.
        </div>
    </footer>
}

export default Footer
