'use client';

import { useState, useEffect } from 'react';

export default function DebugMovies() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                console.log('🔍 Fetching recent bookings to check movie names...');
                const response = await fetch('/api/admin/recent-bookings');
                const data = await response.json();
                
                if (data.success && data.bookings) {
                    console.log('🔍 Found bookings:', data.bookings.length);
                    
                    // Filter bookings that have movies
                    const bookingsWithMovies = data.bookings.filter((booking: any) => 
                        booking.selectedMovies && Array.isArray(booking.selectedMovies) && booking.selectedMovies.length > 0
                    );
                    
                    console.log('🔍 Bookings with movies:', bookingsWithMovies.length);
                    
                    bookingsWithMovies.forEach((booking: any, index: number) => {
                        console.log(`🎬 Booking ${index + 1}:`, booking.bookingId);
                        console.log('   Movies:', booking.selectedMovies);
                        booking.selectedMovies.forEach((movie: any, movieIndex: number) => {
                            console.log(`   Movie ${movieIndex + 1}:`, {
                                id: movie.id,
                                name: movie.name,
                                title: movie.title,
                                type: typeof movie,
                                raw: movie
                            });
                        });
                    });
                    
                    setBookings(bookingsWithMovies);
                } else {
                    console.log('🔍 No bookings found or API error');
                }
            } catch (error) {
                console.error('🔍 Error fetching bookings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    if (loading) {
        return (
            <div style={{ padding: '20px', color: 'white', backgroundColor: '#000', minHeight: '100vh' }}>
                <h1>Debug Movies in Database</h1>
                <p>Loading bookings...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', color: 'white', backgroundColor: '#000', minHeight: '100vh' }}>
            <h1>Debug Movies in Database</h1>
            <p>Found {bookings.length} bookings with movies</p>
            
            {bookings.length === 0 ? (
                <p>No bookings with movies found in database.</p>
            ) : (
                bookings.map((booking, index) => (
                    <div key={booking.bookingId || index} style={{ 
                        border: '1px solid #333', 
                        margin: '20px 0', 
                        padding: '20px',
                        backgroundColor: '#111'
                    }}>
                        <h2>Booking: {booking.bookingId}</h2>
                        <p><strong>Customer:</strong> {booking.customerName || booking.name}</p>
                        <p><strong>Date:</strong> {booking.date}</p>
                        <p><strong>Theater:</strong> {booking.theaterName || booking.theater}</p>
                        
                        <h3>Movies ({booking.selectedMovies.length}):</h3>
                        {booking.selectedMovies.map((movie: any, movieIndex: number) => (
                            <div key={movieIndex} style={{ 
                                backgroundColor: '#222', 
                                padding: '10px', 
                                margin: '10px 0',
                                borderRadius: '5px'
                            }}>
                                <p><strong>Movie {movieIndex + 1}:</strong></p>
                                <p><strong>Type:</strong> {typeof movie}</p>
                                {typeof movie === 'string' ? (
                                    <p><strong>Title:</strong> {movie}</p>
                                ) : (
                                    <>
                                        <p><strong>ID:</strong> {movie.id || 'N/A'}</p>
                                        <p><strong>Name:</strong> {movie.name || 'N/A'}</p>
                                        <p><strong>Title:</strong> {movie.title || 'N/A'}</p>
                                        <p><strong>Price:</strong> ₹{movie.price || 0}</p>
                                        <p><strong>Quantity:</strong> {movie.quantity || 1}</p>
                                    </>
                                )}
                                <details>
                                    <summary>Raw Data</summary>
                                    <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                                        {JSON.stringify(movie, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        ))}
                    </div>
                ))
            )}
            
            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#222', borderRadius: '5px' }}>
                <h3>Instructions:</h3>
                <ol>
                    <li>Make a new booking with a movie to test</li>
                    <li>Check the console for detailed movie data</li>
                    <li>Verify that movie names are complete (not truncated)</li>
                    <li>Check both the booking details popup and this debug page</li>
                </ol>
            </div>
        </div>
    );
}
