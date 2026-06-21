using System;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace HotelReservationWeb.Attributes
{
    public class StrongPasswordAttribute : ValidationAttribute
    {
        protected override ValidationResult IsValid(object value, ValidationContext validationContext)
        {
            var password = value as string;

            if (string.IsNullOrWhiteSpace(password))
                return new ValidationResult("Password is required.");

            if (password.Length < 8)  // ← changed from 12 to 8
                return new ValidationResult("Password must be at least 8 characters.");

            if (!Regex.IsMatch(password, "[A-Z]"))
                return new ValidationResult("Password must contain at least one uppercase letter.");

            if (!Regex.IsMatch(password, "[a-z]"))
                return new ValidationResult("Password must contain at least one lowercase letter.");

            if (!Regex.IsMatch(password, @"\d"))
                return new ValidationResult("Password must contain at least one number.");

            if (!Regex.IsMatch(password, @"[\W_]"))
                return new ValidationResult("Password must contain at least one special character.");

            return ValidationResult.Success;
        }
    }
}