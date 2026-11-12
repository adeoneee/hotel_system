package com.example.hotel_backend.auth;

import com.example.hotel_backend.user.AppUser;
import com.example.hotel_backend.user.AppUserRepository;
import com.example.hotel_backend.user.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AppUserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerNormalizesEmailAndCreatesGuest() {
        when(userRepository.existsByEmailIgnoreCase("guest@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken(any(AppUser.class))).thenReturn("jwt-token");
        when(jwtService.getExpirationSeconds()).thenReturn(1800L);

        AuthResponse response = authService.register(
            new RegisterRequest(" Guest User ", " GUEST@EXAMPLE.COM ", "password123")
        );

        assertEquals("jwt-token", response.accessToken());
        assertEquals("guest@example.com", response.user().email());
        assertEquals("Guest User", response.user().fullName());
        assertEquals(UserRole.GUEST, response.user().role());
        verify(passwordEncoder).encode("password123");
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmailIgnoreCase("guest@example.com")).thenReturn(true);

        assertThrows(
            EmailAlreadyExistsException.class,
            () -> authService.register(
                new RegisterRequest("Guest", "guest@example.com", "password123")
            )
        );

        verify(userRepository, never()).save(any(AppUser.class));
    }

    @Test
    void loginRejectsInvalidCredentials() {
        when(authenticationManager.authenticate(any()))
            .thenThrow(new BadCredentialsException("Invalid credentials"));

        assertThrows(
            InvalidCredentialsException.class,
            () -> authService.login(new LoginRequest("guest@example.com", "wrong-password"))
        );
    }

    @Test
    void currentUserReturnsUserInformation() {
        AppUser user = new AppUser();
        user.setFullName("Guest User");
        user.setEmail("guest@example.com");
        user.setRole(UserRole.GUEST);
        when(userRepository.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(user));

        AuthResponse.UserInfo result = authService.currentUser("guest@example.com");

        assertEquals("Guest User", result.fullName());
        assertEquals("guest@example.com", result.email());
        assertEquals(UserRole.GUEST, result.role());
    }

    @Test
    void currentUserThrowsWhenUserDoesNotExist() {
        when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

        assertThrows(
            InvalidCredentialsException.class,
            () -> authService.currentUser("missing@example.com")
        );
    }
}
