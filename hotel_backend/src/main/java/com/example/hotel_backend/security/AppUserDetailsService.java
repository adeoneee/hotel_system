package com.example.hotel_backend.security;

import com.example.hotel_backend.user.AppUser;
import com.example.hotel_backend.user.AppUserRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final AppUserRepository userRepository;

    public AppUserDetailsService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        AppUser appUser = userRepository
            .findByEmailIgnoreCase(username.trim())
            .orElseThrow(() -> new UsernameNotFoundException(
                "Пользователь не найден"
            ));

        return User.builder()
            .username(appUser.getEmail())
            .password(appUser.getPasswordHash())
            .authorities("ROLE_" + appUser.getRole().name())
            .disabled(!appUser.isEnabled())
            .build();
    }
}