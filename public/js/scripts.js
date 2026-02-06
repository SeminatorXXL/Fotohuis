function applyParallaxMobile() {
    const banner = document.querySelector('.underbanner');

    if (banner) {
        function updateParallax() {
            const scrolled = window.pageYOffset;
            banner.style.backgroundPositionY = -(scrolled * 0.4) + 'px';
        }
    
        if (window.innerWidth < 1200) {
            window.addEventListener('scroll', updateParallax);
        } else {
            // Reset background position if resized to desktop
            banner.style.backgroundPositionY = 'center';
            window.removeEventListener('scroll', updateParallax);
        }
    }

}

window.addEventListener('resize', applyParallaxMobile);
window.addEventListener('load', applyParallaxMobile);