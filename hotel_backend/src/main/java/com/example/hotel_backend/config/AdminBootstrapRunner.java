package com.example.hotel_backend.config;

import com.example.hotel_backend.user.AppUser;
import com.example.hotel_backend.user.AppUserRepository;
import com.example.hotel_backend.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger LOGGER =
        LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String configuredEmail;
    private final String configuredPassword;

    public AdminBootstrapRunner(
        AppUserRepository userRepository,
        PasswordEncoder passwordEncoder,
        @Value("${app.bootstrap-admin.email:}") String configuredEmail,
        @Value("${app.bootstrap-admin.password:}") String configuredPassword
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.configuredEmail = configuredEmail;
        this.configuredPassword = configuredPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (configuredEmail.isBlank() && configuredPassword.isBlank()) {
            LOGGER.info("Bootstrap admin is not configured; skipping");
            return;
        }

        if (configuredEmail.isBlank() || configuredPassword.isBlank()) {
            throw new IllegalStateException(
                "Both bootstrap admin email and password must be configured"
            );
        }

        String email = configuredEmail.trim().toLowerCase(Locale.ROOT);

        var existingUser = userRepository.findByEmailIgnoreCase(email);

        if (existingUser.isPresent()) {
            if (existingUser.get().getRole() != UserRole.ADMIN) {
                throw new IllegalStateException(
                    "Bootstrap email already belongs to a non-admin user"
                );
            }

            LOGGER.info("Bootstrap admin already exists; skipping creation");
            return;
        }

        AppUser admin = new AppUser();
        admin.setFullName("Hotel Administrator");
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(configuredPassword));
        admin.setRole(UserRole.ADMIN);
        admin.setEnabled(true);

        userRepository.save(admin);

        LOGGER.info("Bootstrap administrator was created");
    }
}