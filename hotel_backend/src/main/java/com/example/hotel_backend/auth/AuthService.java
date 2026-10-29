package com.example.hotel_backend.auth;

import com.example.hotel_backend.user.AppUser;
import com.example.hotel_backend.user.AppUserRepository;
import com.example.hotel_backend.user.UserRole;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
        AppUserRepository userRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException();
        }

        AppUser user = new AppUser();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.GUEST);
        user.setEnabled(true);

        AppUser savedUser = userRepository.save(user);

        return buildResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    email,
                    request.password()
                )
            );
        } catch (AuthenticationException exception) {
            throw new InvalidCredentialsException();
        }

        AppUser user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(InvalidCredentialsException::new);

        return buildResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse.UserInfo currentUser(String email) {
        AppUser user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(InvalidCredentialsException::new);

        return toUserInfo(user);
    }

    private AuthResponse buildResponse(AppUser user) {
        return new AuthResponse(
            jwtService.generateToken(user),
            "Bearer",
            jwtService.getExpirationSeconds(),
            toUserInfo(user)
        );
    }

    private AuthResponse.UserInfo toUserInfo(AppUser user) {
        return new AuthResponse.UserInfo(
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getRole()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}