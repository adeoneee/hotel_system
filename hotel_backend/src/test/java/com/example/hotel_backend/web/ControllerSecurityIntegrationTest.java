package com.example.hotel_backend.web;

import com.example.hotel_backend.auth.AuthController;
import com.example.hotel_backend.auth.AuthService;
import com.example.hotel_backend.config.SecurityConfig;
import com.example.hotel_backend.room.RoomController;
import com.example.hotel_backend.room.RoomService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
    controllers = {
        RoomController.class,
        AuthController.class
    },
    properties = {
        "app.jwt.secret-base64=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
    }
)
@Import(SecurityConfig.class)
class ControllerSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomService roomService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    @WithMockUser(roles = "GUEST")
    void guestCanGetRooms() throws Exception {
        when(roomService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/rooms"))
            .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "GUEST")
    void guestCannotCreateRoom() throws Exception {
        mockMvc.perform(post("/api/rooms")
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedUserCannotGetProfile() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
            .andExpect(status().isUnauthorized());
    }
}