$(document).ready(function () {
  const currentYear = new Date().getFullYear();
  const startYear = 1800;

  const $dropdown = $("#publication_year");

  $dropdown.find('option:not([value=""])').remove();

  for (let year = currentYear; year >= startYear; year--) {
    $dropdown.append(
      $("<option>", {
        value: year,
        text: year,
      })
    );
  }

  loadBooks();

  function loadBooks() {
    $.ajax({
      url: "/api/books/",
      type: "GET",
      success: function (data) {
        $("#book-list").empty();

        if (data.length === 0) {
          $("#book-list").append(
            '<tr><td colspan="6" class="px-6 py-4 text-center">No books available</td></tr>'
          );
          return;
        }

        $.each(data, function (index, book) {
          let coverImg = book.cover_pic
            ? `<img src="${book.cover_pic}" alt="${book.title}" class="h-12 w-auto object-cover">`
            : '<div class="h-12 w-10 bg-gray-200 flex items-center justify-center text-gray-500">N/A</div>';

          let row = `
                        <tr class="border-t">
                            <td class="px-4 py-3">${book.title}</td>
                            <td class="px-4 py-3">${book.author}</td>
                            <td class="px-4 py-3">${book.publication_year}</td>
                            <td class="px-4 py-3">${book.available}/${book.stock}</td>
                            <td class="px-4 py-3 flex items-center space-x-2">
                                <a href="/books/view/${book.id}" 
                                class="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-md transition" 
                                title="View ${book.title}">
                                View
                                </a>
                                <button class="text-red-600 hover:text-red-800 delete-book" data-id="${book.id}" title="Delete ${book.title}">
                                    <i class="fa fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;

          $("#book-list").append(row);
        });

        $(".delete-book").click(function () {
          let bookId = $(this).data("id");
          if (confirm("Are you sure you want to delete this book?")) {
            deleteBook(bookId);
          }
        });
      },
      error: function (xhr) {
        console.error("Error loading books:", xhr);
        alert("Failed to load books. Please try again later.");
      },
    });
  }

  function deleteBook(bookId) {
    $.ajax({
      url: `/api/books/${bookId}/`,
      type: "DELETE",
      success: function () {
        loadBooks();
      },
      error: function (xhr) {
        console.error("Error deleting book:", xhr);
        alert("Failed to delete book. Please try again later.");
      },
    });
  }

  $("#add-book-form").submit(function (e) {
    e.preventDefault();

    let formData = new FormData(this);

    $.ajax({
      url: "/api/books/",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        showNotification("Book added successfully!", "success");
        window.location.href = "/books/";
      },
      error: function (xhr) {
        console.error("Error adding book:", xhr);

        if (xhr.responseJSON) {
          let errors = "";
          $.each(xhr.responseJSON, function (field, messages) {
            errors += `${field}: ${messages.join(", ")}\n`;
          });
          alert(`Failed to add book:\n${errors}`);
        } else {
          alert("Failed to add book. Please check your inputs and try again.");
        }
      },
    });
  });

  $("#available, #stock").change(function () {
    let available = parseInt($("#available").val()) || 0;
    let stock = parseInt($("#stock").val()) || 0;

    if (available > stock) {
      alert("Available quantity cannot exceed stock quantity.");
      $("#available").val(stock);
    }
  });

  const currentBookId = window.location.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  $("#editBookBtn").on("click", function () {
    $.ajax({
      url: `/api/books/${currentBookId}/`,
      method: "GET",
      success: function (data) {
        $("#input_title").val(data.title);
        $("#input_author").val(data.author);
        $("#input_publication_year").val(data.publication_year);
        $("#input_publisher").val(data.publisher);
        $("#input_genre").val(data.genre);
        $("#input_stock").val(data.stock);
        $("#input_available").val(data.available);
        $("#input_description").val(data.description);

        $("#editBookModal").removeClass("hidden");
      },
      error: function (error) {
        console.error("Error fetching book details:", error);
        alert("Failed to load book details. Please try again.");
      },
    });
  });

  $("#closeModal, #cancelEdit").on("click", function () {
    $("#editBookModal").addClass("hidden");
  });

  $("#editBookForm").on("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    $.ajax({
      url: `/api/books/${currentBookId}/update/`,
      method: "PUT",
      data: formData,
      processData: false,
      contentType: false,
      success: function (data) {
        $("#bookTitle").text(data.title);
        $("#bookAuthor").text(data.author);
        $("#bookYear").text(data.publication_year || "N/A");
        $("#bookPublisher").text(data.publisher || "N/A");
        $("#bookGenre").text(data.genre || "N/A");
        $("#bookStock").text(data.stock);
        $("#bookAvailable").text(data.available);
        $("#bookDescription").text(
          data.description || "No description available."
        );

        if (formData.get("cover_pic") && formData.get("cover_pic").size > 0) {
          window.location.reload();
        } else {
          $("#editBookModal").addClass("hidden");
        }

        showNotification("Book updated successfully", "success");
      },
      error: function (error) {
        console.error("Error updating book:", error);
        showNotification(
          "Failed to update book. Please check the form and try again.",
          "error"
        );
      },
    });
  });

  function showNotification(message, type) {
    const notificationClass =
      type === "success" ? "bg-green-500" : "bg-red-500";

    const notification = $(`
            <div class="fixed top-4 right-4 px-4 py-2 rounded-md text-white ${notificationClass} shadow-lg transition-opacity duration-300">
                ${message}
            </div>
        `);

    $("body").append(notification);

    setTimeout(function () {
      notification.css("opacity", "0");
      setTimeout(function () {
        notification.remove();
      }, 300);
    }, 3000);
  }
});
